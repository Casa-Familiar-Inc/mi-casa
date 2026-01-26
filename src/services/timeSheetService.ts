import {
    HR_TimeSheetHeader,
    HR_TimeSheetLog,
    HR_CompTimeEntry,
    HR_EmployeeSettings,
    TimeSheetFull
} from "../types/timesheet";
import { AuditService } from "./AuditService";
import { authClient } from "../lib/auth";

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

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
                const response = await fetch(`${API_BASE}/timesheets/${headerId}`, { credentials: 'include' });
                if (response.ok) {
                    const old = await response.json();
                    oldStatus = old.status;
                }
            } catch (e) { /* ignore */ }
        }

        // The new backend should handle the batch/atomic operation in a single endpoint
        const { header, logs, compTime } = data;
        const payload = {
            ...header,
            logs,
            compTime,
            employee_email: userEmail
        };

        const response = await fetch(`${API_BASE}/timesheets${headerId ? `/${headerId}` : ''}`, {
            method: headerId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to save timesheet");
        }

        const result = await response.json();
        const savedId = result.id || headerId;

        const action = isNew ? 'CREATE' : (data.header.status === 'Submitted' && oldStatus !== 'Submitted' ? 'SUBMIT' : 'UPDATE');

        AuditService.log({
            target_collection: 'HR_TimeSheetHeaders',
            target_id: savedId,
            action_type: action,
            details: { status: data.header.status, user_email: userEmail }
        }).catch(console.error);

        return savedId;
    },

    async getTimeSheet(employeeEmail: string, periodStart: string): Promise<TimeSheetFull | null> {
        try {
            const response = await fetch(`${API_BASE}/timesheets?employee_email=${employeeEmail}&period_start=${periodStart}`, { credentials: 'include' });
            if (!response.ok) return null;
            const items = await response.json();
            return items.length > 0 ? items[0] : null; // Backend should return expanded object
        } catch (error) {
            console.error("Error fetching timesheet:", error);
            return null;
        }
    },

    async getMyTimeSheets(email: string): Promise<HR_TimeSheetHeader[]> {
        try {
            const response = await fetch(`${API_BASE}/timesheets?employee_email=${email}&_sort=-period_start`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching my timesheets:", error);
            return [];
        }
    },

    async ensureTimeSheet(email: string, start: string, end: string, user: string): Promise<string> {
        const existing = await this.getTimeSheet(email, start);
        if (existing) {
            return existing.header.id;
        }

        try {
            const response = await fetch(`${API_BASE}/timesheets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    employee_email: email,
                    employee_name: user,
                    period_start: start,
                    period_end: end,
                    status: 'Draft',
                    total_hours: 0,
                }),
            });
            const header = await response.json();

            await AuditService.log({
                target_collection: 'HR_TimeSheetHeaders',
                target_id: header.id,
                action_type: 'CREATE_DRAFT',
                details: { period: start }
            });

            return header.id;
        } catch (error) {
            console.error("Error ensuring timesheet:", error);
            throw error;
        }
    },

    async getTimeSheetById(id: string): Promise<TimeSheetFull | null> {
        try {
            const response = await fetch(`${API_BASE}/timesheets/${id}`, { credentials: 'include' });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching timesheet by ID:", error);
            return null;
        }
    },

    async getSubmittedTimeSheets(statuses: string[] = ['Submitted']): Promise<HR_TimeSheetHeader[]> {
        try {
            const { data: session } = await authClient.getSession();
            const directReports: string[] = (session?.user as any)?.directReports || [];

            if (directReports.length === 0) return [];

            const statusQuery = statuses.map(s => `status=${s}`).join('&');
            const reportsQuery = directReports.map(email => `employee_email=${email}`).join('&');

            const response = await fetch(`${API_BASE}/timesheets?${statusQuery}&${reportsQuery}&_sort=-period_start`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching submitted timesheets:", error);
            return [];
        }
    },

    async getUserSettings(email: string): Promise<HR_EmployeeSettings | null> {
        try {
            const response = await fetch(`${API_BASE}/employees/settings?user_email=${email}`, { credentials: 'include' });
            if (!response.ok) return null;
            const items = await response.json();
            return items.length > 0 ? items[0] : null;
        } catch (error) {
            return null;
        }
    },

    async saveUserSettings(settings: HR_EmployeeSettings): Promise<void> {
        try {
            const existing = await this.getUserSettings(settings.user_email);
            const response = await fetch(`${API_BASE}/employees/settings${existing ? `/${existing.id}` : ''}`, {
                method: existing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error("Failed to save settings");
        } catch (error) {
            console.error("Error saving user settings:", error);
            throw error;
        }
    },

    async approveTimeSheet(headerId: string, supervisorName: string): Promise<void> {
        try {
            await fetch(`${API_BASE}/timesheets/${headerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'Approved',
                    supervisor_signed_by: supervisorName,
                    supervisor_signed_date: new Date().toLocaleString()
                }),
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
            await fetch(`${API_BASE}/timesheets/${headerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'Rejected',
                    supervisor_signed_by: '',
                    employee_signed_by: '',
                    employee_signed_date: ''
                }),
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
