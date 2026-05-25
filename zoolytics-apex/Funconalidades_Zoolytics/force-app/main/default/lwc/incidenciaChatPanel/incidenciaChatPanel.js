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
                ...this.getMessageUi(item)
            }));
            this.scrollToBottom();
        } else if (error) {
            this.showError("No se pudieron cargar los mensajes.", error);
        }
    }

    get hasMessages() {
        return this.messages.length > 0;
    }

    get isChatClosed() {
        return this.messages.some((item) => item.isSystem);
    }

    get closedBannerText() {
        const closingMessage = this.messages.find((item) => item.isSystem);
        return closingMessage?.message || "La incidencia esta finalizada y el chat se ha bloqueado.";
    }

    get isSendDisabled() {
        return this.isChatClosed || this.sending || !this.draftMessage || !this.draftMessage.trim();
    }

    handleDraftChange(event) {
        if (this.isChatClosed) {
            return;
        }
        this.draftMessage = event.target.value;
    }

    handleInternalChange(event) {
        if (this.isChatClosed) {
            return;
        }
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

    getMessageUi(item) {
        if (item.isSystem) {
            return {
                containerClass: "message-row system",
                bubbleClass: "message-bubble system",
                metaClass: "meta meta-system"
            };
        }

        const fromWeb = item.isCurrentUser;
        return {
            containerClass: fromWeb ? "message-row from-web" : "message-row from-tech",
            bubbleClass: fromWeb
                ? `message-bubble from-web${item.isInternal ? " is-internal" : ""}`
                : "message-bubble from-tech",
            metaClass: fromWeb ? "meta meta-web" : "meta meta-tech"
        };
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
