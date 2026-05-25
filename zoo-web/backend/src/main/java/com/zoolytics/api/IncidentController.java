package com.zoolytics.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "https://zoolytics-tfg.vercel.app",
        "https://zoolytics-h1283swc1-hojasilvanas-projects.vercel.app"
})
public class IncidentController {

    private final SalesforceService salesforceService;

    public IncidentController(SalesforceService salesforceService) {
        this.salesforceService = salesforceService;
    }

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of("message", "Zoolytics API running", "health", "/api/incidents/health");
    }

    @PostMapping("/api/incidents")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> request) {
        try {
            Map<String, Object> result = salesforceService.createIncident(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Datos de incidencia no válidos", "detail", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Error creando incidencia en Salesforce", "detail", e.getMessage()));
        }
    }

    @PatchMapping("/api/incidents/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable("id") String id, @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El campo status es obligatorio"));
            }
            salesforceService.updateIncidentStatus(id, status);
            return ResponseEntity.ok(Map.of("message", "Estado actualizado"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Error actualizando estado en Salesforce", "detail", e.getMessage()));
        }
    }

    @GetMapping("/api/incidents/{id}/messages")
    public ResponseEntity<?> listMessages(
            @PathVariable("id") String id,
            @RequestParam(name = "includeInternal", defaultValue = "false") boolean includeInternal
    ) {
        try {
            List<Map<String, Object>> messages = salesforceService.listIncidentMessages(id, includeInternal);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Error consultando mensajes en Salesforce", "detail", e.getMessage()));
        }
    }

    @PostMapping("/api/incidents/{id}/messages")
    public ResponseEntity<?> createMessage(@PathVariable("id") String id, @RequestBody Map<String, Object> request) {
        try {
            String text = request.get("text") == null ? "" : request.get("text").toString().trim();
            if (text.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El campo text es obligatorio"));
            }
            boolean isInternal = Boolean.TRUE.equals(request.get("isInternal"));
            String authorName = request.get("authorName") == null ? "" : request.get("authorName").toString();
            Map<String, Object> result = salesforceService.createIncidentMessage(id, text, isInternal, authorName);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Error creando mensaje en Salesforce", "detail", e.getMessage()));
        }
    }

    @GetMapping("/api/incidents/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
