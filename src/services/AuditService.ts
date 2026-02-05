import { authClient } from "../lib/auth";
import { api } from "../lib/api";

export interface AuditLogPayload {
    target_collection: string;
    target_id: string;
    action_type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
    actor_id?: string;
    actor_name?: string;
}

export const AuditService = {
    async log(payload: AuditLogPayload): Promise<void> {
        try {
            // Get user session for actor details if not provided
            let user;
            if (!payload.actor_id || !payload.actor_name) {
                try {
                    const { data: session } = await authClient.getSession();
                    user = session?.user;
                } catch (e) { /* ignore auth error in audit */ }
            }

            const data = {
                target_collection: payload.target_collection,
                target_id: payload.target_id,
                action_type: payload.action_type,
                details: payload.details ? JSON.stringify(payload.details) : null,
                actor_id: payload.actor_id || user?.id,
                actor_name: payload.actor_name || user?.name || user?.email || 'System'
            };

            await api.post('/audit-logs', data);

        } catch (error) {
            console.error("Failed to create audit log:", error);
        }
    }
};
