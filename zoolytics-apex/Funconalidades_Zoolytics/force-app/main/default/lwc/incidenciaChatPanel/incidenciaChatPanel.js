import { LightningElement, api, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import getMessages from "@salesforce/apex/IncidenciaChatController.getMessages";
import sendMessage from "@salesforce/apex/IncidenciaChatController.sendMessage";

export default class IncidenciaChatPanel extends LightningElement {
    @api recordId;

    draftMessage = "";
    isInternal = false;
    messages = [];
    wiredMessagesResult;
    sending = false;

    @wire(getMessages, { incidenciaId: "$recordId" })
    wiredMessages(value) {
        this.wiredMessagesResult = value;
        const { data, error } = value;

        if (data) {
            this.messages = data.map((item) => ({
                ...item,
                formattedDate: this.formatDate(item.createdDate),
                containerClass: item.isCurrentUser ? "message-row mine" : "message-row",
                bubbleClass: item.isCurrentUser ? "message-bubble mine" : "message-bubble"
            }));
            this.scrollToBottom();
        } else if (error) {
            this.showError("No se pudieron cargar los mensajes.", error);
        }
    }

    get hasMessages() {
        return this.messages.length > 0;
    }

    get isSendDisabled() {
        return this.sending || !this.draftMessage || !this.draftMessage.trim();
    }

    handleDraftChange(event) {
        this.draftMessage = event.target.value;
    }

    handleInternalChange(event) {
        this.isInternal = event.target.checked;
    }

    async handleSend() {
        if (this.isSendDisabled) {
            return;
        }

        this.sending = true;
        try {
            await sendMessage({
                incidenciaId: this.recordId,
                message: this.draftMessage,
                isInternal: this.isInternal
            });

            this.draftMessage = "";
            await refreshApex(this.wiredMessagesResult);
        } catch (error) {
            this.showError("No se pudo enviar el mensaje.", error);
        } finally {
            this.sending = false;
        }
    }

    formatDate(value) {
        if (!value) {
            return "";
        }
        return new Intl.DateTimeFormat("es-ES", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date(value));
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            const container = this.refs?.messagesContainer;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        });
    }

    showError(title, error) {
        const message =
            error?.body?.message ||
            error?.message ||
            "Se produjo un error inesperado.";

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant: "error"
            })
        );
    }
}
