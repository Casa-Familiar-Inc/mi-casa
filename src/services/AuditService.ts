import pb from "../pocketbase";

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
            const user = pb.authStore.record;

            const data = {
                target_collection: payload.target_collection,
                target_id: payload.target_id,
                action_type: payload.action_type,
                details: payload.details ? JSON.stringify(payload.details) : null,
                actor_id: payload.actor_id || user?.id,
                actor_name: payload.actor_name || user?.name || user?.email || 'System'
            };

            await pb.collection('HR_AuditLogs').create(data);
            // console.log("Audit Log Created:", data.action_type, data.target_id);

        } catch (error) {
            // We do not want audit logging failure to break the main application flow,
            // but we should log it to console.
            console.error("Failed to create audit log:", error);
        }
    }
};
