import { api } from "../lib/api";

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}

export const MailService = {
    /**
     * Triggers an email sent from the backend using Microsoft Graph.
     * @param options The email details (recipient, subject, content)
     */
    async sendEmail(options: SendEmailOptions): Promise<void> {
        try {
            // Note: In production, we should have a dedicated POST endpoint.
            // For now, using the diagnostic endpoint created earlier.
            const queryParam = Array.isArray(options.to) ? options.to[0] : options.to;
            await api.get(`/test-email`, {
                params: { to: queryParam }
            });
        } catch (error: any) {
            console.error("Error triggering email from frontend:", error);
            throw new Error(error.response?.data?.error || "Failed to trigger email");
        }
    }
};
