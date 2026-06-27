package com.healthid.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.ai.ChatMessageDto;
import com.healthid.dto.ai.ChatRequest;
import com.healthid.dto.ai.ChatResponse;
import com.healthid.dto.ai.HealthAnalysisRequest;
import com.healthid.dto.ai.HealthAnalysisResponse;
import com.healthid.dto.ai.RecommendedArticle;
import com.healthid.dto.ai.SymptomCheckRequest;
import com.healthid.dto.ai.SymptomCheckResponse;
import com.healthid.dto.doctor.DoctorResponse;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.MedicalHistory;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.entity.Vaccination;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.MedicalHistoryRepository;
import com.healthid.repository.UserRepository;
import com.healthid.repository.VaccinationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class AIService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final VaccinationRepository vaccinationRepository;
    private final MedicalHistoryRepository medicalHistoryRepository;
    private final DoctorService doctorService;
    private final AuditLogService auditLogService;
    private final EncryptionService encryptionService;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.model}")
    private String model;

    public AIService(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            VaccinationRepository vaccinationRepository,
            MedicalHistoryRepository medicalHistoryRepository,
            DoctorService doctorService,
            AuditLogService auditLogService,
            EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.vaccinationRepository = vaccinationRepository;
        this.medicalHistoryRepository = medicalHistoryRepository;
        this.doctorService = doctorService;
        this.auditLogService = auditLogService;
        this.encryptionService = encryptionService;
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

        String profileContext = healthProfileRepository.findByUserId(user.getId())
                .map(this::buildChatProfileContext)
                .orElse("No health profile data available.");

        String systemPrompt = """
                You are the Health ID Sri Lanka medical assistant chatbot inside a digital health web application.

                ONLY answer questions related to:
                - Human health, symptoms, wellness, nutrition, fitness, sleep, and mental wellbeing
                - Preventive care, vaccinations, allergies, BMI, and lifestyle for people
                - How to use this Health ID app (profile, Health ID card, symptom checker, e-Channeling, appointments, AI analysis)

                You MUST REFUSE questions about non-human topics such as:
                - Animal, plant, or veterinary health
                - Programming, coding, mathematics, politics, sports, entertainment, or general trivia
                - Any subject unrelated to human health or this healthcare application

                When refusing, say politely: "I can only help with human health topics and using the Health ID application."

                Rules:
                - Never provide a medical diagnosis — suggest seeing a licensed doctor for serious concerns
                - Keep answers concise, warm, and practical (2-4 short paragraphs max)
                - Use plain language suitable for patients in Sri Lanka

                User health context:
                """ + profileContext;

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (request.getHistory() != null) {
            for (ChatMessageDto entry : request.getHistory()) {
                if (entry.getRole() != null && entry.getContent() != null
                        && ("user".equals(entry.getRole()) || "assistant".equals(entry.getRole()))) {
                    messages.add(Map.of("role", entry.getRole(), "content", entry.getContent()));
                }
            }
        }
        messages.add(Map.of("role", "user", "content", request.getMessage()));

        String reply = callOpenAIChat(messages);
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

    private String buildChatProfileContext(HealthProfile profile) {
        return "Gender: " + profile.getGender()
                + ", BMI: " + profile.getBmi()
                + ", Blood type: " + profile.getBloodType()
                + ", Allergies: " + (allergiesText(profile) != null ? allergiesText(profile) : "none");
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
        String systemPrompt = messages.isEmpty() ? "" : messages.get(0).get("content");
        String userPrompt = messages.size() > 1 ? messages.get(messages.size() - 1).get("content") : "";

        if (apiKey == null || apiKey.isBlank()) {
            return fallbackResponse(systemPrompt, userPrompt);
        }
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("max_tokens", 1024);
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
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            return fallbackResponse(systemPrompt, userPrompt);
        }
    }

    private String fallbackResponse(String systemPrompt, String userPrompt) {
        if (systemPrompt.contains("medical assistant chatbot")) {
            return "I'm your Health ID medical assistant. I can help with human health questions and how to use this app. "
                    + "For symptoms, try the AI Symptom Checker on the homepage. For diet advice, run AI Health Analysis on your profile. "
                    + "Please note: I cannot diagnose conditions — consult a licensed doctor for medical concerns.";
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
}
