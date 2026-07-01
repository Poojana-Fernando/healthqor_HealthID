package com.healthid.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.healthcare.FacilitySearchRequest;
import com.healthid.dto.healthcare.FacilitySearchResponse;
import com.healthid.dto.healthcare.HealthcareFacilityDto;
import com.healthid.entity.User;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HealthcareFacilityService {

    private static final String DISCLAIMER =
            "Facility data is sourced from OpenStreetMap and may be incomplete. "
                    + "This is not a medical diagnosis. Call ahead or visit the nearest emergency department for urgent care.";

    private static final List<String> DEFAULT_AMENITIES = List.of("hospital", "clinic", "doctors", "pharmacy");

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.model}")
    private String model;

    public HealthcareFacilityService(UserRepository userRepository, AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    public FacilitySearchResponse search(String requesterEmail, FacilitySearchRequest request) {
        User user = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        int radiusKm = request.getRadiusKm() != null && request.getRadiusKm() > 0
                ? Math.min(request.getRadiusKm(), 50)
                : 15;
        double lat = request.getLat().doubleValue();
        double lng = request.getLng().doubleValue();
        String condition = request.getCondition().trim();

        if (condition.isBlank()) {
            throw new BadRequestException("Medical condition is required");
        }

        List<String> amenities = resolveAmenities(condition);
        List<RawFacility> rawFacilities = queryOverpass(lat, lng, radiusKm, amenities);

        if (rawFacilities.isEmpty()) {
            auditLogService.log(user.getId(), "HEALTHCARE_FACILITY_SEARCH", "Healthcare", null);
            return FacilitySearchResponse.builder()
                    .disclaimer("No healthcare facilities found within " + radiusKm + " km. Try increasing the search radius.")
                    .recommendedFacilityId(null)
                    .facilities(List.of())
                    .build();
        }

        List<HealthcareFacilityDto> withDistance = rawFacilities.stream()
                .map(f -> toDto(f, haversineKm(lat, lng, f.lat, f.lng)))
                .sorted(Comparator.comparingDouble(HealthcareFacilityDto::getDistanceKm))
                .limit(25)
                .toList();

        List<HealthcareFacilityDto> ranked = rankFacilities(condition, withDistance);

        String recommendedId = ranked.isEmpty() ? null : ranked.get(0).getId();

        auditLogService.log(user.getId(), "HEALTHCARE_FACILITY_SEARCH", "Healthcare", null);

        return FacilitySearchResponse.builder()
                .disclaimer(DISCLAIMER)
                .recommendedFacilityId(recommendedId)
                .facilities(ranked)
                .build();
    }

    private List<String> resolveAmenities(String condition) {
        String systemPrompt = """
                You are a healthcare facility search assistant for Sri Lanka.
                Given a patient's medical condition or symptom, return JSON only:
                {
                  "amenities": ["hospital", "clinic", "doctors", "pharmacy"],
                  "specialty_hint": "short specialty keyword or empty string"
                }
                Choose 1-4 amenity values from: hospital, clinic, doctors, pharmacy.
                Use hospital for emergencies and serious conditions; clinic/doctors for routine care; pharmacy for minor issues.
                Return only valid JSON, no prose.
                """;

        try {
            String response = callOpenAI(systemPrompt, "Condition: " + condition);
            JsonNode json = extractJson(response);
            List<String> amenities = new ArrayList<>();
            if (json.has("amenities") && json.get("amenities").isArray()) {
                json.get("amenities").forEach(n -> {
                    String val = n.asText("").trim().toLowerCase();
                    if (DEFAULT_AMENITIES.contains(val)) {
                        amenities.add(val);
                    }
                });
            }
            if (!amenities.isEmpty()) {
                return amenities;
            }
        } catch (Exception ignored) {
        }
        return List.of("hospital", "clinic");
    }

    private List<RawFacility> queryOverpass(double lat, double lng, int radiusKm, List<String> amenities) {
        int radiusM = radiusKm * 1000;
        StringBuilder query = new StringBuilder();
        query.append("[out:json][timeout:25];\n(\n");
        for (String amenity : amenities) {
            query.append("  node[\"amenity\"=\"").append(amenity).append("\"](around:")
                    .append(radiusM).append(",").append(lat).append(",").append(lng).append(");\n");
            query.append("  way[\"amenity\"=\"").append(amenity).append("\"](around:")
                    .append(radiusM).append(",").append(lat).append(",").append(lng).append(");\n");
            query.append("  node[\"healthcare\"=\"").append(amenity).append("\"](around:")
                    .append(radiusM).append(",").append(lat).append(",").append(lng).append(");\n");
            query.append("  way[\"healthcare\"=\"").append(amenity).append("\"](around:")
                    .append(radiusM).append(",").append(lat).append(",").append(lng).append(");\n");
        }
        query.append(");\nout center tags;\n");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String body = "data=" + java.net.URLEncoder.encode(query.toString(), java.nio.charset.StandardCharsets.UTF_8);

            ResponseEntity<String> response = restTemplate.exchange(
                    "https://overpass-api.de/api/interpreter",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode elements = root.path("elements");
            if (!elements.isArray()) {
                return List.of();
            }

            Map<String, RawFacility> deduped = new LinkedHashMap<>();
            elements.forEach(el -> {
                RawFacility facility = parseElement(el);
                if (facility != null && facility.name != null && !facility.name.isBlank()) {
                    String key = facility.name.toLowerCase() + "|" + Math.round(facility.lat * 100) + "|" + Math.round(facility.lng * 100);
                    deduped.putIfAbsent(key, facility);
                }
            });
            return new ArrayList<>(deduped.values());
        } catch (Exception e) {
            return List.of();
        }
    }

    private RawFacility parseElement(JsonNode el) {
        String type = el.path("type").asText("");
        long osmId = el.path("id").asLong();
        double elLat;
        double elLng;

        if ("node".equals(type)) {
            elLat = el.path("lat").asDouble();
            elLng = el.path("lon").asDouble();
        } else if ("way".equals(type) || "relation".equals(type)) {
            JsonNode center = el.path("center");
            if (center.isMissingNode()) {
                return null;
            }
            elLat = center.path("lat").asDouble();
            elLng = center.path("lon").asDouble();
        } else {
            return null;
        }

        JsonNode tags = el.path("tags");
        String name = firstNonBlank(tags, "name", "name:en");
        if (name == null) {
            return null;
        }

        String facilityType = resolveFacilityType(tags);
        if (facilityType == null) {
            return null;
        }

        String phone = firstNonBlank(tags, "phone", "contact:phone", "contact:mobile");
        String address = buildAddress(tags);
        boolean largeHospital = isLargeHospital(tags, facilityType, name);

        return new RawFacility(
                "osm-" + type + "-" + osmId,
                name,
                facilityType,
                phone,
                address,
                elLat,
                elLng,
                largeHospital
        );
    }

    private String resolveFacilityType(JsonNode tags) {
        String amenity = tags.path("amenity").asText("").trim().toLowerCase();
        String healthcare = tags.path("healthcare").asText("").trim().toLowerCase();

        if ("pharmacy".equals(amenity) || "pharmacy".equals(healthcare)) {
            return "pharmacy";
        }
        if (!amenity.isBlank()) {
            return amenity;
        }
        if (!healthcare.isBlank()) {
            return healthcare;
        }
        return "healthcare";
    }

    private boolean isLargeHospital(JsonNode tags, String facilityType, String name) {
        String type = facilityType == null ? "" : facilityType.toLowerCase();
        if ("pharmacy".equals(type) || "clinic".equals(type) || "doctors".equals(type) || "doctor".equals(type)) {
            return false;
        }

        String healthcare = tags.path("healthcare").asText("").toLowerCase();
        String amenity = tags.path("amenity").asText("").toLowerCase();
        if ("pharmacy".equals(healthcare) || "pharmacy".equals(amenity)) {
            return false;
        }
        if (!"hospital".equals(type) && !"hospital".equals(healthcare)) {
            return false;
        }

        String lowerName = name.toLowerCase();
        if (lowerName.contains("pharmacy") || lowerName.contains("chemist") || lowerName.contains("dispensary")) {
            return false;
        }

        String bedsRaw = tags.path("beds").asText("").trim();
        if (!bedsRaw.isBlank()) {
            try {
                int beds = Integer.parseInt(bedsRaw.replaceAll("[^0-9]", ""));
                if (beds >= 50) {
                    return true;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        if ("yes".equalsIgnoreCase(tags.path("emergency").asText(""))) {
            return true;
        }

        if (lowerName.contains("national hospital")
                || lowerName.contains("general hospital")
                || lowerName.contains("teaching hospital")
                || lowerName.contains("district hospital")
                || lowerName.contains("base hospital")
                || lowerName.contains("medical college")) {
            return true;
        }

        return false;
    }

    private String firstNonBlank(JsonNode tags, String... keys) {
        for (String key : keys) {
            String val = tags.path(key).asText("").trim();
            if (!val.isBlank()) {
                return val;
            }
        }
        return null;
    }

    private String buildAddress(JsonNode tags) {
        List<String> parts = new ArrayList<>();
        String housenumber = tags.path("addr:housenumber").asText("").trim();
        String street = tags.path("addr:street").asText("").trim();
        String city = tags.path("addr:city").asText("").trim();
        String full = tags.path("addr:full").asText("").trim();

        if (!housenumber.isBlank() || !street.isBlank()) {
            parts.add((housenumber + " " + street).trim());
        }
        if (!city.isBlank()) {
            parts.add(city);
        }
        if (!full.isBlank()) {
            return full;
        }
        return parts.isEmpty() ? null : String.join(", ", parts);
    }

    private HealthcareFacilityDto toDto(RawFacility f, double distanceKm) {
        return HealthcareFacilityDto.builder()
                .id(f.id)
                .name(f.name)
                .type(f.type)
                .phone(f.phone)
                .address(f.address)
                .lat(f.lat)
                .lng(f.lng)
                .distanceKm(round(distanceKm, 1))
                .largeHospital(f.largeHospital)
                .build();
    }

    private List<HealthcareFacilityDto> rankFacilities(String condition, List<HealthcareFacilityDto> candidates) {
        if (candidates.isEmpty()) {
            return List.of();
        }

        String systemPrompt = """
                You are a healthcare facility ranking assistant for Sri Lanka.
                Given a patient's medical condition and a list of nearby facilities, return JSON only:
                {
                  "ranked": [
                    {"id": "osm-node-123", "match_reason": "short reason why this facility fits the condition and distance"}
                  ]
                }
                Order from best to worst match considering medical condition relevance AND distance.
                Prefer hospitals for emergencies; clinics for routine specialty care; pharmacies only for minor issues.
                Include every facility id from the input list exactly once.
                Return only valid JSON, no prose.
                """;

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("Condition: ").append(condition).append("\nFacilities:\n");
        for (HealthcareFacilityDto f : candidates) {
            userPrompt.append("- id=").append(f.getId())
                    .append(", name=").append(f.getName())
                    .append(", type=").append(f.getType())
                    .append(", distance_km=").append(f.getDistanceKm())
                    .append("\n");
        }

        try {
            String response = callOpenAI(systemPrompt, userPrompt.toString());
            JsonNode json = extractJson(response);
            JsonNode ranked = json.path("ranked");
            if (!ranked.isArray() || ranked.isEmpty()) {
                return fallbackRank(candidates);
            }

            Map<String, HealthcareFacilityDto> byId = candidates.stream()
                    .collect(Collectors.toMap(HealthcareFacilityDto::getId, f -> f, (a, b) -> a));

            List<HealthcareFacilityDto> result = new ArrayList<>();
            Set<String> seen = new HashSet<>();

            for (int i = 0; i < ranked.size(); i++) {
                JsonNode node = ranked.get(i);
                String id = node.path("id").asText("");
                String reason = node.path("match_reason").asText("Recommended based on condition and distance.");
                HealthcareFacilityDto original = byId.get(id);
                if (original != null && seen.add(id)) {
                    result.add(HealthcareFacilityDto.builder()
                            .id(original.getId())
                            .name(original.getName())
                            .type(original.getType())
                            .phone(original.getPhone())
                            .address(original.getAddress())
                            .lat(original.getLat())
                            .lng(original.getLng())
                            .distanceKm(original.getDistanceKm())
                            .rank(result.size() + 1)
                            .matchReason(reason)
                            .largeHospital(original.isLargeHospital())
                            .build());
                }
            }

            for (HealthcareFacilityDto f : candidates) {
                if (!seen.contains(f.getId())) {
                    result.add(HealthcareFacilityDto.builder()
                            .id(f.getId())
                            .name(f.getName())
                            .type(f.getType())
                            .phone(f.getPhone())
                            .address(f.getAddress())
                            .lat(f.getLat())
                            .lng(f.getLng())
                            .distanceKm(f.getDistanceKm())
                            .rank(result.size() + 1)
                            .matchReason("Nearby " + f.getType())
                            .largeHospital(f.isLargeHospital())
                            .build());
                }
            }

            for (int i = 0; i < result.size(); i++) {
                HealthcareFacilityDto f = result.get(i);
                f.setRank(i + 1);
            }

            return result;
        } catch (Exception e) {
            return fallbackRank(candidates);
        }
    }

    private List<HealthcareFacilityDto> fallbackRank(List<HealthcareFacilityDto> candidates) {
        List<HealthcareFacilityDto> result = new ArrayList<>();
        int rank = 1;
        for (HealthcareFacilityDto f : candidates) {
            result.add(HealthcareFacilityDto.builder()
                    .id(f.getId())
                    .name(f.getName())
                    .type(f.getType())
                    .phone(f.getPhone())
                    .address(f.getAddress())
                    .lat(f.getLat())
                    .lng(f.getLng())
                    .distanceKm(f.getDistanceKm())
                    .rank(rank++)
                    .matchReason("Nearest " + f.getType() + " (" + f.getDistanceKm() + " km away)")
                    .largeHospital(f.isLargeHospital())
                    .build());
        }
        return result;
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private double round(double value, int places) {
        return BigDecimal.valueOf(value).setScale(places, RoundingMode.HALF_UP).doubleValue();
    }

    private String callOpenAI(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("OpenAI API key not configured");
        }

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("max_tokens", 1024);
            body.put("messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
            ));

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
            throw new BadRequestException("AI request failed");
        }
    }

    private JsonNode extractJson(String text) throws Exception {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return objectMapper.readTree(text.substring(start, end + 1));
        }
        throw new BadRequestException("Invalid AI response");
    }

    private record RawFacility(
            String id,
            String name,
            String type,
            String phone,
            String address,
            double lat,
            double lng,
            boolean largeHospital
    ) {}
}
