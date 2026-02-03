import { HR_TimeOffRequest } from "../types/timeoff";
import { AuditService } from "./AuditService";

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;
const API_URL = `${API_BASE}/time-off`;

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

            const response = await fetch(`${API_URL}/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || JSON.stringify(err.errors) || "Failed to update request");
            }
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
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || JSON.stringify(err.errors) || "Failed to save request");
            }
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
            const response = await fetch(`${API_URL}/pending`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching pending time off requests:", error);
            return [];
        }
    },

    async getApprovedRequestsByPeriod(email: string, start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await fetch(`${API_URL}?status=Approved&employee_email=${email}&start_date_lte=${end}&end_date_gte=${start}`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching approved time off requests by period:", error);
            return [];
        }
    },

    async getActiveRequestsByPeriod(email: string, start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            // Fetch Pending and Approved requests that overlap the range
            const [pending, approved] = await Promise.all([
                fetch(`${API_URL}?status=Pending&employee_email=${email}&start_date_lte=${end}&end_date_gte=${start}`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}?status=Approved&employee_email=${email}&start_date_lte=${end}&end_date_gte=${start}`, { credentials: 'include' }).then(r => r.ok ? r.json() : [])
            ]);
            return [...pending, ...approved];
        } catch (error) {
            console.error("Error fetching active time off requests by period:", error);
            return [];
        }
    },

    async getAllRequestsByPeriod(start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await fetch(`${API_URL}?start_date_lte=${end}&end_date_gte=${start}&_sort=employee_name`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching all time off requests by period:", error);
            return [];
        }
    },

    async deleteRequest(id: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                credentials: 'include'
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to delete request");
            }
            return true;
        } catch (error) {
            console.error("Error deleting time off request:", error);
            throw error;
        }
    },

    async updateStatus(id: string, status: string, comments?: string, role: string = 'Supervisor'): Promise<boolean> {
        try {
            const response = await fetch(`${API_URL}/${id}/status`, {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, comments, role }),
                credentials: 'include'
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to update status");
            }
            return true;
        } catch (error) {
            console.error("Error updating time off status:", error);
            throw error;
        }
    }
};
