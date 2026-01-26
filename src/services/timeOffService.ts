import { HR_TimeOffRequest } from "../types/timeoff";
import { AuditService } from "./AuditService";

const API_URL = `${import.meta.env.VITE_API_URL}/api/time-off`;

export const TimeOffService = {
    async saveRequest(data: Partial<HR_TimeOffRequest>, userEmail: string): Promise<string> {
        let requestId = data.id;
        let isNew = false;
        let oldStatus = '';

        if (requestId) {
            try {
                const response = await fetch(`${API_URL}/${requestId}`, { credentials: 'include' });
                if (response.ok) {
                    const old = await response.json();
                    oldStatus = old.status;
                }
            } catch (e) { /* ignore */ }

            await fetch(`${API_URL}/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(data),
            });
        } else {
            isNew = true;
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    ...data,
                    employee_email: userEmail,
                    status: data.status || 'Draft'
                }),
            });
            const record = await response.json();
            requestId = record.id;
        }

        const action = isNew ? 'CREATE' : (data.status === 'Pending' && oldStatus !== 'Pending' ? 'SUBMIT' : 'UPDATE');

        AuditService.log({
            target_collection: 'HR_TimeOffRequests',
            target_id: requestId!,
            action_type: action,
            details: { status: data.status, user_email: userEmail }
        }).catch(console.error);

        return requestId!;
    },

    async getRequestById(id: string): Promise<HR_TimeOffRequest | null> {
        try {
            const response = await fetch(`${API_URL}/${id}`, { credentials: 'include' });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching time off request by ID:", error);
            return null;
        }
    },

    async getMyRequests(email: string): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await fetch(`${API_URL}?employee_email=${email}&_sort=-created`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching my time off requests:", error);
            return [];
        }
    },

    async getPendingRequests(): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await fetch(`${API_URL}?status=Pending&_sort=-created`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching pending time off requests:", error);
            return [];
        }
    },

    async getApprovedRequestsByPeriod(email: string, start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            // Simplified filter for the REST API
            const response = await fetch(`${API_URL}?status=Approved&employee_email=${email}&start_date_lte=${end}&end_date_gte=${start}`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching approved time off requests by period:", error);
            return [];
        }
    }
};
