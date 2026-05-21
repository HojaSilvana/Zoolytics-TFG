public with sharing class IncidenciaChatController {
    private static final String TECHNICIAN_DISPLAY_NAME = 'Tecnico de Biopark Rio Verde';

    public class ChatMessageDTO {
        @AuraEnabled public Id id;
        @AuraEnabled public String message;
        @AuraEnabled public String authorName;
        @AuraEnabled public Datetime createdDate;
        @AuraEnabled public Boolean isInternal;
        @AuraEnabled public Boolean isCurrentUser;

        public ChatMessageDTO(Incidencia_mensaje__c source) {
            id = source.Id;
            message = source.Mensaje__c;
            authorName = String.isBlank(source.AutorNombre__c)
                ? (source.CreatedBy != null ? source.CreatedBy.Name : null)
                : source.AutorNombre__c;
            createdDate = source.CreatedDate;
            isInternal = source.esInterno__c;
            isCurrentUser = source.CreatedById == UserInfo.getUserId();
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<ChatMessageDTO> getMessages(Id incidenciaId) {
        if (incidenciaId == null) {
            throw new AuraHandledException('Debes indicar una incidencia.');
        }

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
            SELECT Id
            FROM Incidencia__c
            WHERE Id = :incidenciaId
            LIMIT 1
        ];

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
}
