import {
    HR_TimeSheetHeader,
    HR_TimeSheetLog,
    HR_CompTimeEntry,
    HR_EmployeeSettings,
    TimeSheetFull
} from "../types/timesheet";
import { AuditService } from "./AuditService";
import { authClient } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { api } from "../lib/api";

export const TimeSheetService = {

    async saveTimeSheet(
        data: TimeSheetFull,
        userEmail: string
    ): Promise<string> {
        let headerId = data.header.id;
        let isNew = !headerId;
        let oldStatus = '';

        if (headerId) {
            try {
                const response = await api.get(`/timesheets/${headerId}`);
                oldStatus = response.data.status;
            } catch (e) { /* ignore */ }
        }

        const { header, logs, compTime } = data;
        const payload = {
            ...header,
            logs,
            compTime,
            employee_email: userEmail
        };

        const method = headerId ? 'patch' : 'post';
        const url = headerId ? `/timesheets/${headerId}` : '/timesheets';

        try {
            const response = await api[method](url, payload);
            const savedId = response.data.id || headerId;

            const action = isNew ? 'CREATE' : (data.header.status === 'Submitted' && oldStatus !== 'Submitted' ? 'SUBMIT' : 'UPDATE');

            AuditService.log({
                target_collection: 'HR_TimeSheetHeaders',
                target_id: savedId,
                action_type: action,
                details: { status: data.header.status, user_email: userEmail }
            }).catch(console.error);

            return savedId;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || "Failed to save timesheet");
        }
    },

    async getTimeSheet(employeeEmail: string, periodStart: string): Promise<TimeSheetFull | null> {
        try {
            const response = await api.get('/timesheets', {
                params: {
                    employee_email: employeeEmail,
                    period_start: periodStart
                }
            });
            const items = response.data;
            return items.length > 0 ? items[0] : null;
        } catch (error) {
            console.error("Error fetching timesheet:", error);
            return null;
        }
    },

    async getMyTimeSheets(): Promise<HR_TimeSheetHeader[]> {
        try {
            const response = await api.get('/timesheets/my');
            return response.data;
        } catch (error) {
            console.error("Error fetching my timesheets:", error);
            return [];
        }
    },

    async ensureTimeSheet(email: string, start: string, end: string, user: string, payPeriodId?: string): Promise<string> {
        const existing = await this.getTimeSheet(email, start);
        if (existing) {
            return existing.header.id;
        }

        try {
            const response = await api.post('/timesheets', {
                employee_email: email,
                employee_name: user,
                period_start: start,
                period_end: end,
                pay_period_id: payPeriodId,
                status: 'Draft',
                total_hours: 0,
            });

            const header = response.data;

            await AuditService.log({
                target_collection: 'HR_TimeSheetHeaders',
                target_id: header.id,
                action_type: 'CREATE_DRAFT',
                details: { period: start }
            });

            return header.id;
        } catch (error: any) {
            console.error("Error ensuring timesheet:", error);
            throw new Error(error.response?.data?.message || "Failed to ensure timesheet");
        }
    },

    async getTimeSheetById(id: string): Promise<TimeSheetFull | null> {
        try {
            const response = await api.get(`/timesheets/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching timesheet by ID:", error);
            return null;
        }
    },

    async getSubmittedTimeSheets(statuses: string[] = ['Submitted'], page = 1, limit = 50, scope?: 'supervised'): Promise<HR_TimeSheetHeader[]> {
        try {
            // Note: We no longer pre-filter with directReports emails on the frontend.
            // The backend handles scope resolution dynamically based on managerId and department.

            const params = new URLSearchParams();
            statuses.forEach(s => params.append('status', s));
            if (scope) params.append('scope', scope);

            params.append('_sort', '-period_start'); // Note: period_start is snake_case in DB
            params.append('_page', String(page));
            params.append('_per_page', String(limit));

            const response = await api.get('/timesheets', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching submitted timesheets:", error);
            return [];
        }
    },

    async getAllTimeSheets(start: string, end: string): Promise<HR_TimeSheetHeader[]> {
        try {
            const response = await api.get('/timesheets', {
                params: {
                    period_start_gte: start,
                    period_start_lte: end,
                    _sort: 'employee_name'
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching all timesheets:", error);
            return [];
        }
    },

    async getUserSettings(email: string): Promise<HR_EmployeeSettings | null> {
        try {
            const response = await api.get('/employees/settings', {
                params: { user_email: email }
            });
            const items = response.data;
            return items.length > 0 ? items[0] : null;
        } catch (error) {
            return null;
        }
    },

    async saveUserSettings(settings: HR_EmployeeSettings): Promise<void> {
        try {
            const existing = await this.getUserSettings(settings.user_email);
            const url = existing ? `/employees/settings/${existing.id}` : '/employees/settings';
            const method = existing ? 'patch' : 'post';

            await api[method](url, settings);
        } catch (error) {
            console.error("Error saving user settings:", error);
            throw error;
        }
    },

    async updateTimeSheet(id: string, updates: Partial<TimeSheetFull>): Promise<void> {
        try {
            await api.patch(`/timesheets/${id}`, updates);
        } catch (error) {
            console.error("Error updating timesheet:", error);
            throw error;
        }
    },

    async getPayPeriods(status?: 'Open' | 'Closed'): Promise<{ id: string, name: string, start_date: string, end_date: string, status: string }[]> {
        try {
            const response = await api.get('/pay-periods', {
                params: status ? { status } : {}
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching pay periods:", error);
            return [];
        }
    },

    async createPayPeriod(name: string, start: string, end: string): Promise<any> {
        try {
            const response = await api.post('/pay-periods', { name, start_date: start, end_date: end });
            return response.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async approveTimeSheet(headerId: string, supervisorName: string): Promise<void> {
        try {
            await api.patch(`/timesheets/${headerId}`, {
                status: 'Approved',
                supervisor_signed_by: supervisorName,
                supervisor_signed_date: new Date().toISOString().replace('T', ' ').split('.')[0].slice(0, 16)
            });

            await AuditService.log({
                target_collection: 'HR_TimeSheetHeaders',
                target_id: headerId,
                action_type: 'APPROVE',
                details: { supervisor: supervisorName }
            });

        } catch (error) {
            console.error("Error approving timesheet:", error);
            throw error;
        }
    },

    async rejectTimeSheet(headerId: string, reason: string): Promise<void> {
        try {
            await api.patch(`/timesheets/${headerId}`, {
                status: 'Rejected',
                additional_info: reason,
                supervisor_signed_by: '',
                employee_signed_by: '',
                employee_signed_date: ''
            });

            await AuditService.log({
                target_collection: 'HR_TimeSheetHeaders',
                target_id: headerId,
                action_type: 'REJECT',
                details: { reason }
            });

        } catch (error) {
            console.error("Error rejecting timesheet:", error);
            throw error;
        }
    }
};
