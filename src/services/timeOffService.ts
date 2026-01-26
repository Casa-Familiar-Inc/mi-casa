import pb from "../pocketbase";
import { HR_TimeOffRequest } from "../types/timeoff";
import { AuditService } from "./AuditService";

export const TimeOffService = {
    async saveRequest(data: Partial<HR_TimeOffRequest>, userEmail: string): Promise<string> {
        let requestId = data.id;
        let isNew = false;
        let oldStatus = '';

        if (requestId) {
            try {
                const old = await pb.collection('HR_TimeOffRequests').getOne(requestId);
                oldStatus = (old as any).status;
            } catch (e) { /* ignore */ }

            await pb.collection('HR_TimeOffRequests').update(requestId, data);
        } else {
            isNew = true;
            const record = await pb.collection('HR_TimeOffRequests').create({
                ...data,
                employee_email: userEmail,
                status: data.status || 'Draft'
            });
            requestId = record.id;
        }

        const action = isNew ? 'CREATE' : (data.status === 'Pending' && oldStatus !== 'Pending' ? 'SUBMIT' : 'UPDATE');

        AuditService.log({
            target_collection: 'HR_TimeOffRequests',
            target_id: requestId,
            action_type: action,
            details: { status: data.status, user_email: userEmail }
        }).catch(console.error);

        return requestId;
    },

    async getRequestById(id: string): Promise<HR_TimeOffRequest | null> {
        try {
            return await pb.collection('HR_TimeOffRequests').getOne<HR_TimeOffRequest>(id);
        } catch (error) {
            console.error("Error fetching time off request by ID:", error);
            return null;
        }
    },

    async getMyRequests(email: string): Promise<HR_TimeOffRequest[]> {
        try {
            return await pb.collection('HR_TimeOffRequests').getFullList({
                filter: `employee_email = "${email}"`,
                sort: '-created',
            });
        } catch (error) {
            console.error("Error fetching my time off requests:", error);
            return [];
        }
    },

    async getPendingRequests(): Promise<HR_TimeOffRequest[]> {
        try {
            // Similar supervisor logic as in TimeSheetService could be added here
            return await pb.collection('HR_TimeOffRequests').getFullList({
                filter: `status = "Pending"`,
                sort: '-created',
            });
        } catch (error) {
            console.error("Error fetching pending time off requests:", error);
            return [];
        }
    },

    async getApprovedRequestsByPeriod(email: string, start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            // Filter: Approved status AND employee email AND overlap with period
            // Overlap logic: (RequestStart <= PeriodEnd) AND (RequestEnd >= PeriodStart)
            const filter = `status = "Approved" && employee_email = "${email}" && start_date <= "${end}" && end_date >= "${start}"`;
            return await pb.collection('HR_TimeOffRequests').getFullList({
                filter: filter,
            });
        } catch (error) {
            console.error("Error fetching approved time off requests by period:", error);
            return [];
        }
    }
};
