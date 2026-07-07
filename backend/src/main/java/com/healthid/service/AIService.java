package com.healthid.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.healthid.dto.ai.ChatMessageDto;
import com.healthid.dto.ai.ChatRequest;
import com.healthid.dto.ai.ChatResponse;
import com.healthid.dto.ai.HealthAnalysisRequest;
import com.healthid.dto.ai.HealthAnalysisResponse;
import com.healthid.dto.ai.RecommendedArticle;
import com.healthid.dto.ai.SymptomCheckRequest;
import com.healthid.dto.ai.SymptomCheckResponse;
import com.healthid.dto.doctor.DoctorResponse;
import com.healthid.entity.Appointment;
import com.healthid.entity.AppointmentStatus;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.MedicalHistory;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.entity.Vaccination;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.AppointmentRepository;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.MedicalHistoryRepository;
import com.healthid.repository.UserRepository;
import com.healthid.repository.VaccinationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AIService {

    private static final Logger log = LoggerFactory.getLogger(AIService.class);

    private final RestTemplate restTemplate = createRestTemplate();
    private final RestTemplate visionRestTemplate = createVisionRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final VaccinationRepository vaccinationRepository;
    private final MedicalHistoryRepository medicalHistoryRepository;
    private final DoctorService doctorService;
    private final AuditLogService auditLogService;
    private final EncryptionService encryptionService;
    private final AppointmentRepository appointmentRepository;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.model}")
    private String model;

    @Value("${openai.api.chat.temperature:0.35}")
    private double chatTemperature;

    @Value("${openai.api.chat.max-tokens:900}")
    private int chatMaxTokens;

    public AIService(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            VaccinationRepository vaccinationRepository,
            MedicalHistoryRepository medicalHistoryRepository,
            DoctorService doctorService,
            AuditLogService auditLogService,
            EncryptionService encryptionService,
            AppointmentRepository appointmentRepository) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.vaccinationRepository = vaccinationRepository;
        this.medicalHistoryRepository = medicalHistoryRepository;
        this.doctorService = doctorService;
        this.auditLogService = auditLogService;
        this.encryptionService = encryptionService;
        this.appointmentRepository = appointmentRepository;
    }

    private String allergiesText(HealthProfile profile) {
        String decrypted = encryptionService.decryptOptional(profile.getAllergies());
        return decrypted != null && !decrypted.isBlank() ? decrypted : null;
    }

    public SymptomCheckResponse symptomCheck(String requesterEmail, SymptomCheckRequest request, BigDecimal lat, BigDecimal lng) {
        User user = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String symptoms = String.join(", ", request.getSymptoms());

        // Build patient health context for personalised triage
        StringBuilder patientContext = new StringBuilder();
        healthProfileRepository.findByUserId(user.getId()).ifPresent(hp -> {
            patientContext.append("\nPatient context:");
            if (hp.getGender() != null) patientContext.append(" Gender: ").append(hp.getGender()).append(".");
            if (hp.getBirthDate() != null) {
                long age = java.time.Period.between(hp.getBirthDate(), java.time.LocalDate.now()).getYears();
                patientContext.append(" Age: ").append(age).append(" years.");
            }
            if (hp.getBmi() != null) patientContext.append(" BMI: ").append(hp.getBmi()).append(".");
            if (hp.getBloodType() != null) patientContext.append(" Blood type: ").append(hp.getBloodType()).append(".");
            String allergies = allergiesText(hp);
            if (allergies != null) patientContext.append(" Allergies: ").append(allergies).append(".");
        });
        List<MedicalHistory> conditions = medicalHistoryRepository.findByUserIdOrderByDiagnosedDateDesc(user.getId());
        if (!conditions.isEmpty()) {
            patientContext.append(" Active/past conditions: ");
            conditions.stream().limit(5).forEach(c -> patientContext.append(c.getConditionName()).append(", "));
        }

        String systemPrompt = """
                You are a triage assistant for Health ID Sri Lanka.
                Given symptoms, return JSON only:
                {
                  "recommended_specialty": "string",
                  "urgency_level": "low|moderate|high|emergency",
                  "disclaimer": "string",
                  "what_not_to_do": ["3-5 clear actions the patient should avoid"],
                  "recommended_articles": [
                    {"title": "article title", "summary": "2-3 sentence summary", "source": "trusted health source name"}
                  ]
                }
                Provide 3 recommended_articles relevant to the symptoms (general health education, not diagnosis).
                If patient context is provided, factor in their age, BMI, allergies, and medical history for more relevant triage.
                Never diagnose. Always recommend seeing a licensed doctor.
                Return only valid JSON, no prose.
                """;

        String userPrompt = "Symptoms: " + symptoms + patientContext;
        String aiResponse = callOpenAI(systemPrompt, userPrompt);

        String specialty = "General Practice";
        String urgency = "moderate";
        String disclaimer = "This is not a medical diagnosis. Please consult a licensed doctor.";
        List<String> whatNotToDo = List.of();
        List<RecommendedArticle> articles = List.of();

        try {
            JsonNode json = extractJson(aiResponse);
            if (json.has("recommended_specialty")) specialty = json.get("recommended_specialty").asText();
            if (json.has("urgency_level")) urgency = json.get("urgency_level").asText();
            if (json.has("disclaimer")) disclaimer = json.get("disclaimer").asText();
            whatNotToDo = toStringList(json.get("what_not_to_do"));
            articles = toArticleList(json.get("recommended_articles"));
        } catch (Exception ignored) {
        }

        List<DoctorResponse> doctors = Collections.emptyList();
        if (lat != null && lng != null) {
            doctors = doctorService.findNearby(lat, lng, specialty);
        } else {
            doctors = doctorService.search(specialty, null, true, null);
        }

        auditLogService.log(user.getId(), "AI_SYMPTOM_CHECK", "AI", null);
        return SymptomCheckResponse.builder()
                .recommendedSpecialty(specialty)
                .urgencyLevel(urgency)
                .disclaimer(disclaimer)
                .whatNotToDo(whatNotToDo)
                .recommendedArticles(articles)
                .nearbyDoctors(doctors)
                .build();
    }

    public ChatResponse chat(String requesterEmail, ChatRequest request) {
        User user = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        HealthProfile profile = healthProfileRepository.findByUserId(user.getId()).orElse(null);
        String userContext = buildChatUserContext(user, profile);

        String systemPrompt = """
                You are the Health ID Sri Lanka medical assistant — a helpful guide inside the Healthqor Health ID web application.

                """ + ChatAppKnowledge.navigationGuide() + """

                """ + ChatAppKnowledge.responseRules() + """

                ## Current user context
                """ + userContext;

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (request.getHistory() != null) {
            for (ChatMessageDto entry : request.getHistory()) {
                if (entry.getRole() == null || entry.getContent() == null) {
                    continue;
                }
                String role = entry.getRole().trim();
                String content = entry.getContent().trim();
                if (content.isBlank()) {
                    continue;
                }
                if ("user".equals(role) || "assistant".equals(role)) {
                    messages.add(Map.of("role", role, "content", content));
                }
            }
        }
        messages.add(Map.of("role", "user", "content", request.getMessage().trim()));

        String reply = callOpenAIChat(messages, chatTemperature, chatMaxTokens);
        if (reply == null || reply.isBlank()) {
            reply = "I'm sorry, I couldn't generate a response right now. Please try again in a moment.";
        }
        auditLogService.log(user.getId(), "AI_CHAT", "AI", null);
        return ChatResponse.builder().reply(reply).build();
    }

    @Transactional
    public HealthAnalysisResponse healthAnalysis(String requesterEmail, HealthAnalysisRequest request) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User target = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!requester.getId().equals(target.getId()) && requester.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Not authorized for this health analysis");
        }

        HealthProfile profile = healthProfileRepository.findByUserId(target.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));
        List<Vaccination> vaccinations = vaccinationRepository.findByUserIdOrderByDateAdministeredDesc(target.getId());
        List<MedicalHistory> history = medicalHistoryRepository.findByUserIdOrderByDiagnosedDateDesc(target.getId());

        String profileSummary = buildAnonymousProfile(profile, vaccinations, history);
        String systemPrompt = """
                Analyse this anonymous health profile and return JSON only:
                {
                  "risk_areas": [],
                  "positive_indicators": [],
                  "lifestyle_tips": [],
                  "next_checkups": [],
                  "diet_recommendations": ["5-7 personalised healthy diet recommendations based on BMI, blood type, allergies, and medical history"]
                }
                Diet recommendations must be practical, culturally appropriate for Sri Lanka, and tailored to the profile data.
                Return only valid JSON, no prose.
                """;

        String aiResponse = callOpenAI(systemPrompt, profileSummary);
        HealthAnalysisResponse response = parseHealthAnalysis(aiResponse);

        profile.setAiHealthScore(aiResponse);
        profile.setLastAiAnalysis(Instant.now());
        healthProfileRepository.save(profile);

        auditLogService.log(requester.getId(), "AI_HEALTH_ANALYSIS", "HealthProfile", profile.getId());
        return response;
    }

    private String buildChatUserContext(User user, HealthProfile profile) {
        StringBuilder ctx = new StringBuilder();
        if (user.getName() != null && !user.getName().isBlank()) {
            ctx.append("Name: ").append(user.getName());
        }
        if (user.getHealthId() != null) {
            appendField(ctx, "Health ID: " + user.getHealthId());
        }
        appendField(ctx, "Role: " + user.getRole());
        appendField(ctx, "Email verified: " + (user.getEmailVerifiedAt() != null));
        appendField(ctx, "Phone verified: " + user.isPhoneVerified());

        if (profile != null) {
            if (profile.getGender() != null) {
                appendField(ctx, "Gender: " + profile.getGender());
            }
            if (profile.getBmi() != null) {
                appendField(ctx, "BMI: " + profile.getBmi());
            }
            if (profile.getBloodType() != null && !profile.getBloodType().isBlank()) {
                appendField(ctx, "Blood type: " + profile.getBloodType());
            }
            try {
                String allergies = allergiesText(profile);
                appendField(ctx, "Allergies: " + (allergies != null ? allergies : "none recorded"));
            } catch (Exception e) {
                log.warn("Could not decrypt allergies for chat context: {}", e.getMessage());
                appendField(ctx, "Allergies: unavailable");
            }

            List<Vaccination> vaccinations = vaccinationRepository
                    .findByUserIdOrderByDateAdministeredDesc(user.getId());
            if (!vaccinations.isEmpty()) {
                String recentVax = vaccinations.stream()
                        .limit(3)
                        .map(Vaccination::getVaccineName)
                        .collect(Collectors.joining(", "));
                appendField(ctx, "Recent vaccinations: " + recentVax);
            }

            List<MedicalHistory> activeConditions = medicalHistoryRepository
                    .findByUserIdOrderByDiagnosedDateDesc(user.getId())
                    .stream()
                    .filter(m -> m.getResolvedDate() == null)
                    .limit(3)
                    .toList();
            if (!activeConditions.isEmpty()) {
                String conditions = activeConditions.stream()
                        .map(MedicalHistory::getConditionName)
                        .collect(Collectors.joining(", "));
                appendField(ctx, "Active conditions: " + conditions);
            }
        }

        long upcomingAppointments = appointmentRepository
                .findByPatientIdOrderByScheduledAtDesc(user.getId())
                .stream()
                .filter(this::isUpcomingAppointment)
                .count();
        if (upcomingAppointments > 0) {
            appendField(ctx, "Upcoming appointments: " + upcomingAppointments
                    + " (view under Profile → My Appointments)");
        }

        return ctx.isEmpty() ? "Limited profile data available." : ctx.toString();
    }

    private boolean isUpcomingAppointment(Appointment appointment) {
        if (appointment.getScheduledAt() == null) {
            return false;
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            return false;
        }
        return appointment.getScheduledAt().isAfter(Instant.now());
    }

    private void appendField(StringBuilder ctx, String field) {
        if (!ctx.isEmpty()) {
            ctx.append(", ");
        }
        ctx.append(field);
    }

    private String buildAnonymousProfile(HealthProfile profile, List<Vaccination> vaccinations, List<MedicalHistory> history) {
        StringBuilder sb = new StringBuilder();
        sb.append("Gender: ").append(profile.getGender()).append("\n");
        sb.append("BMI: ").append(profile.getBmi()).append("\n");
        sb.append("Height (cm): ").append(profile.getHeightCm()).append("\n");
        sb.append("Weight (kg): ").append(profile.getWeightKg()).append("\n");
        sb.append("Blood type: ").append(profile.getBloodType()).append("\n");
        sb.append("Allergies: ").append(allergiesText(profile) != null ? allergiesText(profile) : "none").append("\n");
        sb.append("Vaccinations: ");
        vaccinations.forEach(v -> sb.append(v.getVaccineName()).append(" (dose ").append(v.getDoseNumber()).append("), "));
        sb.append("\nMedical history: ");
        history.forEach(h -> sb.append(h.getConditionName()).append(", "));
        return sb.toString();
    }

    private HealthAnalysisResponse parseHealthAnalysis(String aiResponse) {
        try {
            JsonNode json = extractJson(aiResponse);
            return HealthAnalysisResponse.builder()
                    .riskAreas(toStringList(json.get("risk_areas")))
                    .positiveIndicators(toStringList(json.get("positive_indicators")))
                    .lifestyleTips(toStringList(json.get("lifestyle_tips")))
                    .nextCheckups(toStringList(json.get("next_checkups")))
                    .dietRecommendations(toStringList(json.get("diet_recommendations")))
                    .rawAnalysis(aiResponse)
                    .build();
        } catch (Exception e) {
            return HealthAnalysisResponse.builder()
                    .riskAreas(List.of())
                    .positiveIndicators(List.of())
                    .lifestyleTips(List.of())
                    .nextCheckups(List.of())
                    .dietRecommendations(List.of())
                    .rawAnalysis(aiResponse)
                    .build();
        }
    }

    private List<String> toStringList(JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        List<String> result = new ArrayList<>();
        node.forEach(n -> result.add(n.asText()));
        return result;
    }

    private List<RecommendedArticle> toArticleList(JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        List<RecommendedArticle> result = new ArrayList<>();
        node.forEach(n -> result.add(RecommendedArticle.builder()
                .title(n.path("title").asText(""))
                .summary(n.path("summary").asText(""))
                .source(n.path("source").asText(""))
                .build()));
        return result.stream()
                .filter(a -> a.getTitle() != null && !a.getTitle().isBlank())
                .toList();
    }

    private String callOpenAI(String systemPrompt, String userPrompt) {
        return callOpenAIChat(List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
    }

    private String callOpenAIChat(List<Map<String, String>> messages) {
        return callOpenAIChat(messages, 0.7, 1024);
    }

    private String callOpenAIChat(List<Map<String, String>> messages, double temperature, int maxTokens) {
        String systemPrompt = messages.isEmpty() ? "" : messages.get(0).get("content");
        String userPrompt = messages.size() > 1 ? messages.get(messages.size() - 1).get("content") : "";

        if (apiKey == null || apiKey.isBlank()) {
            return fallbackResponse(systemPrompt, userPrompt);
        }
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("max_tokens", maxTokens);
            body.put("temperature", temperature);
            body.put("messages", messages);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                JsonNode apiError = root.path("error").path("message");
                if (!apiError.isMissingNode() && !apiError.asText("").isBlank()) {
                    log.warn("OpenAI chat API error: {}", apiError.asText());
                }
                return fallbackResponse(systemPrompt, userPrompt);
            }

            String reply = choices.get(0).path("message").path("content").asText("").trim();
            if (reply.isBlank()) {
                return fallbackResponse(systemPrompt, userPrompt);
            }
            return reply;
        } catch (Exception e) {
            log.warn("OpenAI chat request failed: {}", e.getMessage());
            return fallbackResponse(systemPrompt, userPrompt);
        }
    }

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        return new RestTemplate(factory);
    }

    private static RestTemplate createVisionRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);
        factory.setReadTimeout(120_000);
        return new RestTemplate(factory);
    }

    private String fallbackResponse(String systemPrompt, String userPrompt) {
        if (systemPrompt.contains("Health ID Sri Lanka medical assistant")) {
            String lower = userPrompt.toLowerCase();
            if (lower.contains("appointment") || lower.contains("channel") || lower.contains("doctor")) {
                return "To book or view doctor appointments, open **e-Channeling** (`/echanneling`) to search doctors and book a slot. "
                        + "Your booked visits appear under **Profile → My Appointments** (`/profile`). "
                        + "For cancellations, contact the hospital with your reference number.";
            }
            if (lower.contains("hospital") || lower.contains("clinic") || lower.contains("pharmacy")
                    || lower.contains("find care") || lower.contains("nearby")) {
                return "Use **Find Care** at `/find-care` (login required). Select a condition or symptom, allow location, "
                        + "and the map will show nearby hospitals, clinics, and pharmacies with driving routes. "
                        + "This is guidance only — not a diagnosis.";
            }
            if (lower.contains("profile") || lower.contains("vaccin") || lower.contains("allerg")
                    || lower.contains("organ") || lower.contains("health id")) {
                return "Open **Profile** (`/profile`) to view your Health ID, edit health data, see the 3D organ viewer, "
                        + "vaccinations, medical history, run **AI Health Analysis**, and check **My Appointments**.";
            }
            if (lower.contains("symptom") || lower.contains("pain") || lower.contains("fever")) {
                return "For structured symptom triage with urgency and nearby doctors, use the **AI Symptom Checker** on the "
                        + "home page (`/`). I can share general wellness tips here, but I cannot diagnose — see a doctor if "
                        + "symptoms are severe or worsening. Emergency: call **1990**.";
            }
            if (lower.contains("support") || lower.contains("ticket") || lower.contains("bug")
                    || lower.contains("login") || lower.contains("password")) {
                return "For technical or account issues, go to **Support** (`/support`) and submit a support ticket, "
                        + "or use Forgot Password on the login page. I cannot reset passwords from this chat.";
            }
            return "I'm your Health ID assistant. I can help with wellness questions and navigating this app:\n"
                    + "- **Home** `/` — symptom explorer & AI Symptom Checker\n"
                    + "- **Profile** `/profile` — health records, organ viewer, AI analysis, appointments\n"
                    + "- **Find Care** `/find-care` — nearby facilities on a map\n"
                    + "- **e-Channeling** `/echanneling` — book doctors\n"
                    + "- **Support** `/support` — FAQs and support tickets\n"
                    + "I cannot diagnose conditions — consult a licensed doctor for medical concerns.";
        }
        if (systemPrompt.contains("triage")) {
            return """
                    {"recommended_specialty":"General Practice","urgency_level":"moderate",
                    "disclaimer":"This is not a medical diagnosis. Please consult a licensed doctor.",
                    "what_not_to_do":["Do not self-medicate with antibiotics","Avoid strenuous exercise until evaluated","Do not ignore worsening symptoms"],
                    "recommended_articles":[
                      {"title":"When to Seek Medical Care","summary":"Learn the warning signs that require immediate doctor attention.","source":"Health ID Sri Lanka"},
                      {"title":"Managing Common Symptoms at Home","summary":"Safe self-care steps while waiting for your appointment.","source":"WHO"},
                      {"title":"Understanding Urgency Levels","summary":"How triage helps route you to the right specialist.","source":"Ministry of Health"}
                    ]}
                    """;
        }
        return """
                {"risk_areas":["Maintain regular checkups"],"positive_indicators":["Profile data available"],
                "lifestyle_tips":["Stay hydrated","Exercise regularly"],"next_checkups":["Annual physical"],
                "diet_recommendations":["Eat balanced meals with vegetables and lean protein",
                "Limit processed foods and sugary drinks","Include whole grains like red rice",
                "Stay hydrated with 2-3 litres of water daily","Consider smaller portions if BMI is elevated",
                "Include iron-rich foods if blood type suggests anaemia risk","Avoid allergens listed in your profile"]}
                """;
    }

    private JsonNode extractJson(String text) throws Exception {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return objectMapper.readTree(text.substring(start, end + 1));
        }
        throw new BadRequestException("Invalid AI response");
    }

    public String analyzeReportImage(byte[] imageBytes, String contentType) {
        String mime = normalizeVisionContentType(contentType);
        if (mime == null) {
            return unsupportedFormatMessage(contentType);
        }
        if ("application/pdf".equals(mime)) {
            return pdfNotSupportedMessage();
        }

        byte[] preparedBytes;
        try {
            preparedBytes = prepareImageForVision(imageBytes, mime);
        } catch (IOException e) {
            log.warn("Failed to prepare report image for vision: {}", e.getMessage());
            return visionFailureMessage("The image could not be processed. Try a clear JPEG or PNG photo.");
        }

        String base64 = Base64.getEncoder().encodeToString(preparedBytes);
        String dataUrl = "data:" + mime + ";base64," + base64;

        String systemPrompt = """
                You are a medical report assistant for Health ID Sri Lanka. Analyze the uploaded lab or medical report image.
                Provide a plain-language summary for a patient who may not understand medical terminology.
                Structure your response with these sections using markdown headers:
                ## Summary
                ## Key Values & Findings
                ## Items to Discuss with Your Doctor
                ## Disclaimer
                Always end with a clear disclaimer that this is not a medical diagnosis and the patient must consult a licensed doctor.
                """;

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", 2000);
        body.put("temperature", 0.3);

        ArrayNode messages = body.putArray("messages");
        messages.addObject()
                .put("role", "system")
                .put("content", systemPrompt);

        ArrayNode userContent = messages.addObject()
                .put("role", "user")
                .putArray("content");
        userContent.addObject()
                .put("type", "text")
                .put("text", "Please analyze this external medical/lab report and explain it in simple terms.");
        userContent.addObject()
                .put("type", "image_url")
                .putObject("image_url")
                .put("url", dataUrl)
                .put("detail", preparedBytes.length > 1_500_000 ? "low" : "auto");

        return callOpenAIMultimodal(body);
    }

    private String normalizeVisionContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "image/jpeg";
        }
        String mime = contentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
        return switch (mime) {
            case "image/jpg", "image/pjpeg" -> "image/jpeg";
            case "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf" -> mime;
            default -> mime.startsWith("image/") ? mime : null;
        };
    }

    private byte[] prepareImageForVision(byte[] imageBytes, String mime) throws IOException {
        if (!mime.startsWith("image/")) {
            return imageBytes;
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
        if (image == null) {
            return imageBytes;
        }

        int maxDim = 2048;
        int width = image.getWidth();
        int height = image.getHeight();
        boolean needsResize = width > maxDim || height > maxDim || imageBytes.length > 3 * 1024 * 1024;
        if (!needsResize) {
            return imageBytes;
        }

        double scale = Math.min(1.0, Math.min((double) maxDim / width, (double) maxDim / height));
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));

        int imageType = image.getTransparency() == BufferedImage.OPAQUE
                ? BufferedImage.TYPE_INT_RGB
                : BufferedImage.TYPE_INT_ARGB;
        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, imageType);
        Graphics2D graphics = resized.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(image, 0, 0, targetWidth, targetHeight, null);
        graphics.dispose();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        String format = "image/png".equals(mime) ? "png" : "jpeg";
        if (!ImageIO.write(resized, format, output)) {
            return imageBytes;
        }
        return output.toByteArray();
    }

    private String callOpenAIMultimodal(ObjectNode body) {
        if (apiKey == null || apiKey.isBlank() || isPlaceholderApiKey(apiKey)) {
            return """
                    ## Summary
                    OpenAI API key is not configured. Upload saved successfully.

                    ## Details
                    Set a valid OPENAI_API_KEY in the project .env file and restart the backend.

                    ## Disclaimer
                    This is not a medical diagnosis. Please consult a licensed doctor to interpret your lab report.
                    """;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String payload = objectMapper.writeValueAsString(body);
            ResponseEntity<String> response = visionRestTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(payload, headers),
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode errorNode = root.path("error").path("message");
            if (!errorNode.isMissingNode() && !errorNode.asText("").isBlank()) {
                log.warn("OpenAI vision API error: {}", errorNode.asText());
                return visionFailureMessage(parseOpenAiError(errorNode.asText()));
            }

            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                return visionFailureMessage("No analysis was returned.");
            }

            JsonNode message = choices.get(0).path("message");
            String refusal = message.path("refusal").asText("").trim();
            if (!refusal.isBlank()) {
                return visionFailureMessage(refusal);
            }

            String reply = message.path("content").asText("").trim();
            if (reply.isBlank()) {
                return visionFailureMessage("No analysis was returned.");
            }
            return reply;
        } catch (HttpStatusCodeException e) {
            String apiMessage = extractOpenAiErrorMessage(e);
            log.warn("OpenAI vision request failed ({}): {}", e.getStatusCode(), apiMessage);
            return visionFailureMessage(parseOpenAiError(apiMessage));
        } catch (Exception e) {
            log.warn("OpenAI vision request failed: {}", e.getMessage());
            return visionFailureMessage("The analysis service is temporarily unavailable.");
        }
    }

    private String extractOpenAiErrorMessage(HttpStatusCodeException exception) {
        try {
            JsonNode root = objectMapper.readTree(exception.getResponseBodyAsString());
            String message = root.path("error").path("message").asText("").trim();
            if (!message.isBlank()) {
                return message;
            }
        } catch (Exception ignored) {
            // Fall back to status text below.
        }
        return exception.getStatusText();
    }

    private String parseOpenAiError(String apiMessage) {
        if (apiMessage == null || apiMessage.isBlank()) {
            return "The analysis service returned an error.";
        }
        String lower = apiMessage.toLowerCase(Locale.ROOT);
        if (lower.contains("incorrect api key") || lower.contains("invalid_api_key")
                || lower.contains("api key provided")) {
            return "The OpenAI API key is missing or invalid. Set a valid OPENAI_API_KEY in the project .env file and restart the backend.";
        }
        if (lower.contains("unsupported image") || lower.contains("invalid image")
                || lower.contains("could not process image")) {
            return "This image format is not supported. Upload a clear JPEG or PNG photo of the report.";
        }
        if (lower.contains("maximum context length") || lower.contains("too large")) {
            return "The image is too large to analyze. Try a smaller or more compressed photo.";
        }
        return apiMessage;
    }

    private String unsupportedFormatMessage(String contentType) {
        return visionFailureMessage(
                "Unsupported file type"
                        + (contentType != null ? " (" + contentType + ")" : "")
                        + ". Upload a JPEG, PNG, GIF, or WebP photo of the report.");
    }

    private String pdfNotSupportedMessage() {
        return """
                ## Summary
                PDF analysis is not supported yet. Your file was saved, but AI could not read it directly.

                ## What you can try
                - Take a clear photo of the report pages (JPEG or PNG) and upload that instead
                - Ensure lighting is good and all text is readable

                ## Disclaimer
                This is not a medical diagnosis. Please consult a licensed doctor to interpret your lab report.
                """;
    }

    private String visionFailureMessage(String reason) {
        return """
                ## Summary
                We could not analyze this report automatically.

                ## Details
                %s

                ## What you can try
                - Upload a clear JPEG or PNG photo of the report (not PDF)
                - Make sure the image is well-lit and text is readable
                - Try a smaller file under 5 MB

                ## Disclaimer
                This is not a medical diagnosis. Please consult a licensed doctor to interpret your lab report.
                """.formatted(reason);
    }

    private boolean isPlaceholderApiKey(String key) {
        String normalized = key.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("your_")
                || normalized.contains("placeholder")
                || normalized.equals("sk-your-key-here")
                || normalized.equals("changeme");
    }
}
