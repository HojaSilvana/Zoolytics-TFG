public with sharing class IncidenciaChatController {
    private static final String TECHNICIAN_DISPLAY_NAME = 'Tecnico de Biopark Rio Verde';
    private static final String SYSTEM_AUTHOR_NAME = 'Sistema Zoolytics';
    private static final Set<String> CLOSED_STATUS_VALUES = new Set<String>{
        'resuelta',
        'cerrada',
        'resolved',
        'closed'
    };

    public class ChatMessageDTO {
        @AuraEnabled public Id id;
        @AuraEnabled public String message;
        @AuraEnabled public String authorName;
        @AuraEnabled public Datetime createdDate;
        @AuraEnabled public Boolean isInternal;
        @AuraEnabled public Boolean isCurrentUser;
        @AuraEnabled public Boolean isSystem;

        public ChatMessageDTO(Incidencia_mensaje__c source) {
            id = source.Id;
            message = source.Mensaje__c;
            authorName = String.isBlank(source.AutorNombre__c)
                ? (source.CreatedBy != null ? source.CreatedBy.Name : null)
                : source.AutorNombre__c;
            createdDate = source.CreatedDate;
            isInternal = source.esInterno__c;
            isCurrentUser = source.CreatedById == UserInfo.getUserId();
            isSystem = false;
        }

        public ChatMessageDTO(String statusLabel) {
            id = null;
            message = 'La incidencia se ha marcado como ' + statusLabel
                + '. El chat esta finalizado y no admite mas mensajes.';
            authorName = SYSTEM_AUTHOR_NAME;
            createdDate = System.now();
            isInternal = false;
            isCurrentUser = false;
            isSystem = true;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<ChatMessageDTO> getMessages(Id incidenciaId) {
        if (incidenciaId == null) {
            throw new AuraHandledException('Debes indicar una incidencia.');
        }

        Incidencia__c incidencia = [
            SELECT Id, Estado__c
            FROM Incidencia__c
            WHERE Id = :incidenciaId
            LIMIT 1
        ];

        List<Incidencia_mensaje__c> rows = [
            SELECT Id, Mensaje__c, AutorNombre__c, esInterno__c, CreatedDate, CreatedById, CreatedBy.Name
            FROM Incidencia_mensaje__c
            WHERE Incidencia__c = :incidenciaId
            ORDER BY CreatedDate ASC
            LIMIT 500
        ];

        List<ChatMessageDTO> result = new List<ChatMessageDTO>();
        for (Incidencia_mensaje__c row : rows) {
            result.add(new ChatMessageDTO(row));
        }
        if (isClosedStatus(incidencia.Estado__c)) {
            result.add(new ChatMessageDTO(incidencia.Estado__c));
        }
        return result;
    }

    @AuraEnabled
    public static ChatMessageDTO sendMessage(Id incidenciaId, String message, Boolean isInternal) {
        if (incidenciaId == null) {
            throw new AuraHandledException('Debes indicar una incidencia.');
        }
        if (String.isBlank(message)) {
            throw new AuraHandledException('No se puede enviar un mensaje vacio.');
        }

        // Validates that the record exists and is accessible for the running user.
        Incidencia__c existingIncidencia = [
            SELECT Id, Estado__c
            FROM Incidencia__c
            WHERE Id = :incidenciaId
            LIMIT 1
        ];
        if (isClosedStatus(existingIncidencia.Estado__c)) {
            throw new AuraHandledException(
                'La incidencia esta ' + existingIncidencia.Estado__c + '. El chat esta cerrado.'
            );
        }

        Incidencia_mensaje__c newMessage = new Incidencia_mensaje__c(
            Incidencia__c = incidenciaId,
            Mensaje__c = message.trim(),
            esInterno__c = isInternal == null ? false : isInternal,
            AutorNombre__c = TECHNICIAN_DISPLAY_NAME
        );
        insert newMessage;

        Incidencia_mensaje__c insertedRow = [
            SELECT Id, Mensaje__c, AutorNombre__c, esInterno__c, CreatedDate, CreatedById, CreatedBy.Name
            FROM Incidencia_mensaje__c
            WHERE Id = :newMessage.Id
            LIMIT 1
        ];
        return new ChatMessageDTO(insertedRow);
    }

    private static Boolean isClosedStatus(String status) {
        if (String.isBlank(status)) {
            return false;
        }
        return CLOSED_STATUS_VALUES.contains(status.trim().toLowerCase());
    }
}
