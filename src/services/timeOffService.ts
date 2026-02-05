import { HR_TimeOffRequest } from "../types/timeoff";
import { AuditService } from "./AuditService";
import { api } from "../lib/api";

export const TimeOffService = {
    async saveRequest(data: Partial<HR_TimeOffRequest>, userEmail: string): Promise<string> {
        let requestId = data.id;
        let isNew = false;
        let oldStatus = '';

        if (requestId) {
            try {
                const response = await api.get(`/time-off/${requestId}`);
                oldStatus = response.data.status;
            } catch (e) { /* ignore */ }

            try {
                await api.patch(`/time-off/${requestId}`, data);
            } catch (error: any) {
                throw new Error(error.response?.data?.message || JSON.stringify(error.response?.data?.errors) || "Failed to update request");
            }
        } else {
            isNew = true;
            try {
                const response = await api.post('/time-off', {
                    ...data,
                    employee_email: userEmail,
                    status: data.status || 'Draft'
                });
                const record = response.data;
                requestId = record.id;
            } catch (error: any) {
                throw new Error(error.response?.data?.message || JSON.stringify(error.response?.data?.errors) || "Failed to save request");
            }
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

    async getSupervisorHistory(page = 1, limit = 50): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await api.get('/time-off', {
                params: {
                    status: ['Approved', 'Rejected'],
                    _page: page,
                    _per_page: limit
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching supervisor history:", error);
            return [];
        }
    },

    async getRequestById(id: string): Promise<HR_TimeOffRequest | null> {
        try {
            const response = await api.get(`/time-off/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching time off request by ID:", error);
            return null;
        }
    },

    async getMyRequests(email: string): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await api.get('/time-off', {
                params: {
                    employee_email: email,
                    _sort: '-created_at'
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching my time off requests:", error);
            return [];
        }
    },

    async getPendingRequests(page = 1, limit = 50): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await api.get('/time-off/pending', {
                params: {
                    _page: page,
                    _per_page: limit
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching pending time off requests:", error);
            return [];
        }
    },

    async getApprovedRequestsByPeriod(email: string, start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await api.get('/time-off', {
                params: {
                    status: 'Approved',
                    employee_email: email,
                    start_date_lte: end,
                    end_date_gte: start
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching approved time off requests by period:", error);
            return [];
        }
    },

    async getActiveRequestsByPeriod(email: string, start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            // Fetch Pending and Approved requests that overlap the range
            // Axios requests can be concurrent
            const [pendingRes, approvedRes] = await Promise.all([
                api.get('/time-off', {
                    params: { status: 'Pending', employee_email: email, start_date_lte: end, end_date_gte: start }
                }).catch(() => ({ data: [] })),
                api.get('/time-off', {
                    params: { status: 'Approved', employee_email: email, start_date_lte: end, end_date_gte: start }
                }).catch(() => ({ data: [] }))
            ]);
            return [...pendingRes.data, ...approvedRes.data];
        } catch (error) {
            console.error("Error fetching active time off requests by period:", error);
            return [];
        }
    },

    async getAllRequestsByPeriod(start: string, end: string): Promise<HR_TimeOffRequest[]> {
        try {
            const response = await api.get('/time-off', {
                params: {
                    start_date_lte: end,
                    end_date_gte: start,
                    _sort: 'employee_name'
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching all time off requests by period:", error);
            return [];
        }
    },

    async deleteRequest(id: string): Promise<boolean> {
        try {
            await api.delete(`/time-off/${id}`);
            return true;
        } catch (error: any) {
            console.error("Error deleting time off request:", error);
            throw new Error(error.response?.data?.message || "Failed to delete request");
        }
    },

    async updateStatus(id: string, status: string, comments?: string, role: string = 'Supervisor'): Promise<boolean> {
        try {
            await api.patch(`/time-off/${id}/status`, { status, comments, role });
            return true;
        } catch (error: any) {
            console.error("Error updating time off status:", error);
            throw new Error(error.response?.data?.message || "Failed to update status");
        }
    }
};
