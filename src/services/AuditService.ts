import { authClient } from "../lib/auth";

export interface AuditLogPayload {
    target_collection: string;
    target_id: string;
    action_type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
    actor_id?: string;
    actor_name?: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export const AuditService = {
    async log(payload: AuditLogPayload): Promise<void> {
        try {
            const { data: session } = await authClient.getSession();
            const user = session?.user;

            const data = {
                target_collection: payload.target_collection,
                target_id: payload.target_id,
                action_type: payload.action_type,
                details: payload.details ? JSON.stringify(payload.details) : null,
                actor_id: payload.actor_id || user?.id,
                actor_name: payload.actor_name || user?.name || user?.email || 'System'
            };

            await fetch(`${API_URL}/api/audit-logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

        } catch (error) {
            console.error("Failed to create audit log:", error);
        }
    }
};
