package com.zoolytics.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class SalesforceService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final Map<String, String> ROLE_VALUES = Map.of(
            "empleado", "Empleado",
            "visitante", "Visitante"
    );
    private static final Map<String, String> CATEGORY_VALUES = Map.of(
            "mantenimiento", "Mantenimiento",
            "seguridad", "Seguridad",
            "atencion visitante", "Atención Visitante",
            "veterinaria", "Veterinaria",
            "acceso", "Acceso",
            "otro", "Otro"
    );
    private static final Map<String, String> ZONE_VALUES = Map.of(
            "zona 1", "Zona 1",
            "zona 2", "Zona 2",
            "zona 3", "Zona 3",
            "entrada", "Entrada",
            "administracion", "Administración",
            "otra", "Otra"
    );
    private static final Map<String, String> URGENCY_VALUES = Map.of(
            "critica", "Critica",
            "alta", "Alta",
            "media", "Media",
            "baja", "Baja"
    );

    @Value("${salesforce.instance-url}")
    private String instanceUrl;

    @Value("${salesforce.client-id}")
    private String clientId;

    @Value("${salesforce.client-secret}")
    private String clientSecret;

    @Value("${salesforce.api-version}")
    private String apiVersion;

    public Map<String, Object> createIncident(Map<String, Object> request) {
        String token = getAccessToken();
        String url = instanceUrl + "/services/data/" + apiVersion + "/sobjects/Incidencia__c/";

        Map<String, Object> payload = new HashMap<>();
        String subject = requiredText(request.get("subject"), "subject");
        String role = normalizePicklist(request.get("role"), ROLE_VALUES, "role");
        String category = normalizePicklist(request.get("category"), CATEGORY_VALUES, "category");
        String zone = normalizePicklist(request.get("zone"), ZONE_VALUES, "zone");
        String urgency = normalizePicklist(request.get("urgency"), URGENCY_VALUES, "urgency");
        String description = optionalText(request.get("description"));
        String contact = optionalText(request.get("contactEmailOrPhone"));
        if (contact.isBlank()) {
            contact = "sin-contacto@zoolytics.local";
        }

        payload.put("Asunto__c", subject);
        payload.put("Descripcion_Larga__c", description);
        payload.put("Categoria__c", category);
        payload.put("Zona__c", zone);
        payload.put("Urgencia__c", urgency);
        payload.put("Tipo_de_Usuario__c", role);
        payload.put("Email_Contacto__c", contact);
        payload.put("Protocolo_interno__c", toBoolean(request.get("internalProtocol")));
        payload.put("Estado__c", "Nueva");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return response.getBody();
    }

    public void updateIncidentStatus(String salesforceId, String status) {
        String token = getAccessToken();
        String url = instanceUrl + "/services/data/" + apiVersion + "/sobjects/Incidencia__c/" + salesforceId;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> payload = new HashMap<>();
        payload.put("Estado__c", status);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        restTemplate.exchange(url, HttpMethod.PATCH, entity, Void.class);
    }

    public List<Map<String, Object>> listIncidentMessages(String salesforceIncidentId, boolean includeInternal) {
        String token = getAccessToken();
        String resolvedIncidentId = resolveIncidentId(salesforceIncidentId, token);
        String url = instanceUrl + "/services/apexrest/api/incidents/" + resolvedIncidentId
                + "/messages?includeInternal=" + includeInternal;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);
        List<?> records = response.getBody();
        if (records == null) {
            return List.of();
        }

        return records.stream()
                .filter(item -> item instanceof Map<?, ?>)
                .map(item -> (Map<String, Object>) item)
                .toList();
    }

    public Map<String, Object> createIncidentMessage(
            String salesforceIncidentId,
            String text,
            boolean internal,
            String authorName
    ) {
        String token = getAccessToken();
        String resolvedIncidentId = resolveIncidentId(salesforceIncidentId, token);
        String url = instanceUrl + "/services/apexrest/api/incidents/" + resolvedIncidentId + "/messages";

        Map<String, Object> payload = new HashMap<>();
        payload.put("text", text);
        payload.put("isInternal", internal);
        if (authorName != null && !authorName.isBlank()) {
            payload.put("authorName", authorName.trim());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return response.getBody();
    }

    private String resolveIncidentId(String rawIdentifier, String token) {
        String identifier = optionalText(rawIdentifier);
        if (identifier.isBlank()) {
            throw new IllegalArgumentException("El identificador de incidencia es obligatorio");
        }

        String byId = findIncidentIdById(identifier, token);
        if (byId != null) return byId;

        String byName = findIncidentIdByName(identifier, token);
        if (byName != null) return byName;

        String bySimilarity = findClosestIncidentId(identifier, token);
        if (bySimilarity != null) return bySimilarity;

        throw new IllegalArgumentException("No se pudo resolver la incidencia " + identifier + " en Salesforce");
    }

    private String findIncidentIdById(String idCandidate, String token) {
        String soql = "SELECT Id FROM Incidencia__c WHERE Id = '" + escapeSoql(idCandidate) + "' LIMIT 1";
        try {
            return firstRecordId(runSoql(soql, token));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String findIncidentIdByName(String nameCandidate, String token) {
        String soql = "SELECT Id FROM Incidencia__c WHERE Name = '" + escapeSoql(nameCandidate) + "' LIMIT 1";
        return firstRecordId(runSoql(soql, token));
    }

    private String findClosestIncidentId(String idCandidate, String token) {
        if (idCandidate.length() < 10) return null;

        String soql = "SELECT Id FROM Incidencia__c ORDER BY CreatedDate DESC LIMIT 100";
        List<Map<String, Object>> records = runSoql(soql, token);

        return records.stream()
                .map(record -> Objects.toString(record.get("Id"), ""))
                .filter(id -> !id.isBlank())
                .min(Comparator.comparingInt(id -> levenshtein(idCandidate, id)))
                .filter(id -> levenshtein(idCandidate, id) <= 10)
                .orElse(null);
    }

    private List<Map<String, Object>> runSoql(String soql, String token) {
        String url = instanceUrl + "/services/data/" + apiVersion + "/query?q=" + soql;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        Map body = response.getBody();
        if (body == null) return List.of();
        Object rawRecords = body.get("records");
        if (!(rawRecords instanceof List<?> list)) return List.of();

        return list.stream()
                .filter(item -> item instanceof Map<?, ?>)
                .map(item -> (Map<String, Object>) item)
                .toList();
    }

    private String firstRecordId(List<Map<String, Object>> records) {
        if (records == null || records.isEmpty()) return null;
        Object id = records.getFirst().get("Id");
        return id == null ? null : id.toString();
    }

    private String escapeSoql(String input) {
        return input.replace("\\", "\\\\").replace("'", "\\'");
    }

    private int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[a.length()][b.length()];
    }

    private String getAccessToken() {
        String tokenUrl = instanceUrl + "/services/oauth2/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "grant_type=client_credentials"
                + "&client_id=" + clientId
                + "&client_secret=" + clientSecret;

        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, entity, Map.class);

        Map<String, Object> tokenResponse = response.getBody();
        if (tokenResponse == null || tokenResponse.get("access_token") == null) {
            throw new RuntimeException("No se pudo obtener access token de Salesforce");
        }
        return tokenResponse.get("access_token").toString();
    }

    private String requiredText(Object value, String fieldName) {
        String text = optionalText(value);
        if (text.isBlank()) {
            throw new IllegalArgumentException("El campo " + fieldName + " es obligatorio");
        }
        return text;
    }

    private String optionalText(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private String normalizePicklist(Object rawValue, Map<String, String> allowed, String fieldName) {
        String text = requiredText(rawValue, fieldName);
        String key = normalizeKey(text);
        String normalized = allowed.get(key);
        if (normalized == null) {
            throw new IllegalArgumentException("Valor no válido para " + fieldName + ": " + text);
        }
        return normalized;
    }

    private String normalizeKey(String value) {
        String noAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccents.toLowerCase().trim();
    }

    private boolean toBoolean(Object value) {
        if (value instanceof Boolean b) return b;
        if (value == null) return false;
        return "true".equalsIgnoreCase(value.toString().trim());
    }
}
