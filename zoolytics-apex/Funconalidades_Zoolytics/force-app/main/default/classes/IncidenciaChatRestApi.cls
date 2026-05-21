@RestResource(urlMapping='/api/incidents/*/messages')
global with sharing class IncidenciaChatRestApi {
    global class ApiBadRequestException extends Exception {}

    global class MessageResponse {
        public String id;
        public String text;
        public Boolean isInternal;
        public Datetime createdAt;
        public String authorName;

        public MessageResponse(Incidencia_mensaje__c source) {
            id = (String) source.Id;
            text = source.Mensaje__c;
            isInternal = source.esInterno__c;
            createdAt = source.CreatedDate;
            authorName = String.isBlank(source.AutorNombre__c)
                ? (source.CreatedBy != null ? source.CreatedBy.Name : null)
                : source.AutorNombre__c;
        }
    }

    @HttpGet
    global static List<MessageResponse> getMessages() {
        Id incidenciaId = extractIncidentId();
        Boolean includeInternal = parseIncludeInternal(RestContext.request.params.get('includeInternal'));

        List<Incidencia_mensaje__c> rows;
        if (includeInternal) {
            rows = [
                SELECT Id, Mensaje__c, esInterno__c, CreatedDate, AutorNombre__c, CreatedBy.Name
                FROM Incidencia_mensaje__c
                WHERE Incidencia__c = :incidenciaId
                ORDER BY CreatedDate ASC
                LIMIT 500
            ];
        } else {
            rows = [
                SELECT Id, Mensaje__c, esInterno__c, CreatedDate, AutorNombre__c, CreatedBy.Name
                FROM Incidencia_mensaje__c
                WHERE Incidencia__c = :incidenciaId
                AND (esInterno__c = false OR esInterno__c = null)
                ORDER BY CreatedDate ASC
                LIMIT 500
            ];
        }

        List<MessageResponse> response = new List<MessageResponse>();
        for (Incidencia_mensaje__c row : rows) {
            response.add(new MessageResponse(row));
        }
        return response;
    }

    @HttpPost
    global static MessageResponse createMessage() {
        Id incidenciaId = extractIncidentId();
        Map<String, Object> body = parseBody();
        String text = (String) body.get('text');
        Boolean isInternal = toBoolean(body.get('isInternal'));
        String authorName = normalizeAuthorName(body.get('authorName'));

        if (String.isBlank(text)) {
            throw buildBadRequest('El campo "text" es obligatorio.');
        }

        // Validates that the incident exists and is visible to the running user.
        Incidencia__c existingIncidencia = [
            SELECT Id, Contacto__r.Name
            FROM Incidencia__c
            WHERE Id = :incidenciaId
            LIMIT 1
        ];

        Incidencia_mensaje__c newMessage = new Incidencia_mensaje__c(
            Incidencia__c = existingIncidencia.Id,
            Mensaje__c = text.trim(),
            esInterno__c = isInternal == null ? false : isInternal,
            AutorNombre__c = String.isBlank(authorName)
                ? resolveExternalAuthorName(existingIncidencia)
                : authorName
        );
        insert newMessage;

        Incidencia_mensaje__c insertedRow = [
            SELECT Id, Mensaje__c, esInterno__c, CreatedDate, AutorNombre__c, CreatedBy.Name
            FROM Incidencia_mensaje__c
            WHERE Id = :newMessage.Id
            LIMIT 1
        ];
        return new MessageResponse(insertedRow);
    }

    private static Id extractIncidentId() {
        String uri = RestContext.request.requestURI;
        // Expected shape: /services/apexrest/api/incidents/{incidentId}/messages
        List<String> parts = uri == null ? new List<String>() : uri.split('/');
        Integer incidentsIndex = parts.indexOf('incidents');
        if (incidentsIndex < 0 || parts.size() <= incidentsIndex + 1) {
            throw buildBadRequest('No se pudo leer el incidentId de la URL.');
        }

        String rawId = parts[incidentsIndex + 1];
        if (String.isBlank(rawId)) {
            throw buildBadRequest('El incidentId es obligatorio.');
        }

        try {
            return (Id) rawId;
        } catch (Exception ex) {
            throw buildBadRequest('El incidentId no es valido.');
        }
    }

    private static Boolean parseIncludeInternal(String value) {
        if (String.isBlank(value)) {
            return false;
        }
        String normalized = value.trim().toLowerCase();
        return normalized == 'true' || normalized == '1' || normalized == 'yes';
    }

    private static Map<String, Object> parseBody() {
        String rawBody = RestContext.request.requestBody == null
            ? null
            : RestContext.request.requestBody.toString();

        if (String.isBlank(rawBody)) {
            throw buildBadRequest('Debes enviar un body JSON.');
        }

        Object parsed = JSON.deserializeUntyped(rawBody);
        if (!(parsed instanceof Map<String, Object>)) {
            throw buildBadRequest('El body debe ser un objeto JSON.');
        }

        return (Map<String, Object>) parsed;
    }

    private static Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String normalized = String.valueOf(value).trim().toLowerCase();
        return normalized == 'true' || normalized == '1' || normalized == 'yes';
    }

    private static String normalizeAuthorName(Object value) {
        if (value == null) {
            return null;
        }
        String result = String.valueOf(value).trim();
        return String.isBlank(result) ? null : result;
    }

    private static String resolveExternalAuthorName(Incidencia__c incidencia) {
        if (incidencia != null && incidencia.Contacto__r != null && !String.isBlank(incidencia.Contacto__r.Name)) {
            return incidencia.Contacto__r.Name;
        }
        return 'Usuario web';
    }

    private static ApiBadRequestException buildBadRequest(String message) {
        RestContext.response.statusCode = 400;
        return new ApiBadRequestException(message);
    }
}
