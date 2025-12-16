import pb from "../pocketbase";
import {
    HR_TimeSheetHeader,
    HR_TimeSheetLog,
    HR_CompTimeEntry,
    HR_EmployeeSettings,
    TimeSheetFull
} from "../types/timesheet";

export const TimeSheetService = {

    async saveTimeSheet(
        data: TimeSheetFull,
        userEmail: string
    ): Promise<string> {
        // 1. Create or Update Header
        let headerId = data.header.id;
        try {
            if (headerId) {
                await pb.collection('HR_TimeSheetHeaders').update(headerId, {
                    ...data.header,
                    // employee_email: userEmail // REMOVED: Do not overwrite email on update (prevents supervisor stealing)
                });
            } else {
                const created = await pb.collection('HR_TimeSheetHeaders').create({
                    ...data.header,
                    employee_email: userEmail
                });
                headerId = created.id;
            }

            // 2. Manage Logs (Delete old, Create new)
            // Strategy: Fetch existing logs for this header and delete them, then bulk create new ones.
            // Note: PocketBase doesn't have a native "Delete Many" by filter in SDK yet (needs loops or batch if supported).
            // efficient way: get list, loop delete.
            const existingLogs = await pb.collection('HR_TimeSheetLogs').getFullList({
                filter: `header = "${headerId}"`
            });

            // Delete in parallel
            await Promise.all(existingLogs.map(log =>
                pb.collection('HR_TimeSheetLogs').delete(log.id)
            ));

            // Create new logs
            // We do this serially to allow for any errors to stop the process or could be parallel
            for (const log of data.logs) {
                await pb.collection('HR_TimeSheetLogs').create({
                    ...log,
                    header: headerId
                });
            }

            // 3. Manage Comp Time (Delete old, Create new)
            const existingComp = await pb.collection('HR_CompTimeEntries').getFullList({
                filter: `header = "${headerId}"`
            });

            await Promise.all(existingComp.map(comp =>
                pb.collection('HR_CompTimeEntries').delete(comp.id)
            ));

            for (const comp of data.compTime) {
                // Filter out empty entries
                if (!comp.date && !comp.rationale) continue;

                await pb.collection('HR_CompTimeEntries').create({
                    ...comp,
                    header: headerId
                });
            }

            return headerId;

        } catch (error) {
            console.error("Error saving timesheet:", error);
            throw error;
        }
    },

    async getTimeSheet(employeeEmail: string, periodStart: string): Promise<TimeSheetFull | null> {
        try {
            // Find Header
            const headers = await pb.collection('HR_TimeSheetHeaders').getList<HR_TimeSheetHeader>(1, 1, {
                filter: `employee_email = "${employeeEmail}" && period_start = "${periodStart}"`,
                expand: 'HR_TimeSheetLogs(header),HR_CompTimeEntries(header)' // Reverse expansion
            });

            if (headers.items.length === 0) {
                return null;
            }

            const header = headers.items[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expanded = header.expand as any;

            const logs: HR_TimeSheetLog[] = expanded['HR_TimeSheetLogs(header)'] || [];
            const compTime: HR_CompTimeEntry[] = expanded['HR_CompTimeEntries(header)'] || [];

            // Sort logs by date? 
            // Logs usually need to be ordered. PnP implementation ordered them by insertion? 
            // Better to sort by date.
            logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return {
                header,
                logs,
                compTime
            };

        } catch (error) {
            console.error("Error fetching timesheet:", error);
            return null;
        }
    },

    async getMyTimeSheets(email: string): Promise<HR_TimeSheetHeader[]> {
        try {
            return await pb.collection('HR_TimeSheetHeaders').getFullList({
                filter: `employee_email = "${email}"`,
                sort: '-period_start',
            });
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
            const header = await pb.collection('HR_TimeSheetHeaders').create({
                employee_email: email,
                employee_name: user,
                period_start: start,
                period_end: end,
                status: 'Draft',
                total_hours: 0,
                additional_info: '',
                employee_signed_by: '',
                employee_signed_date: '',
                supervisor_signed_by: '',
                supervisor_signed_date: ''
            });
            return header.id;
        } catch (error) {
            console.error("Error ensuring timesheet:", error);
            throw error;
        }
    },

    async getTimeSheetById(id: string): Promise<TimeSheetFull | null> {
        try {
            const header = await pb.collection('HR_TimeSheetHeaders').getOne<HR_TimeSheetHeader>(id, {
                expand: 'HR_TimeSheetLogs(header),HR_CompTimeEntries(header)'
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expanded = header.expand as any;
            const logs: HR_TimeSheetLog[] = expanded['HR_TimeSheetLogs(header)'] || [];
            const compTime: HR_CompTimeEntry[] = expanded['HR_CompTimeEntries(header)'] || [];

            logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return { header, logs, compTime };
        } catch (error) {
            console.error("Error fetching timesheet by ID:", error);
            return null;
        }
    },

    async getSubmittedTimeSheets(statuses: string[] = ['Submitted']): Promise<HR_TimeSheetHeader[]> {
        try {
            // Filter by statuses provided
            const statusFilter = statuses.map(s => `status = "${s}"`).join(' || ');
            let filter = `(${statusFilter})`;

            // Secure Logic:
            // 1. Get current logged-in user
            const currentUser = pb.authStore.record;
            // 2. Read 'direct_reports' from their record (synced from Graph)
            // It's a JSON field, so it comes back as an array of strings
            const directReports: string[] = (currentUser as any)?.direct_reports || [];

            if (directReports.length > 0) {
                // Construct OR filter: (employee_email = "a" || employee_email = "b" ...)
                const emailFilters = directReports
                    .map(email => `employee_email = "${email}"`)
                    .join(' || ');

                filter += ` && (${emailFilters})`;
            } else {
                // If user has no direct reports (and is trying to view dashboard), 
                // arguably they shouldn't see anything, or only their own?
                // For a "Supervisor Dashboard", if you have no one, you see nothing.
                // We'll return empty immediately to save a call.
                return [];
            }

            console.log("Supervisor Debug - Reports:", directReports);
            console.log("Supervisor Debug - Filter:", filter);

            return await pb.collection('HR_TimeSheetHeaders').getFullList({
                filter: filter,
                sort: '-period_start',
                requestKey: null // Disable auto-cancellation
            });
        } catch (error) {
            console.error("Error fetching submitted timesheets:", error);
            return [];
        }
    },

    async getUserSettings(email: string): Promise<HR_EmployeeSettings | null> {
        try {
            const result = await pb.collection('HR_EmployeeSettings').getList<HR_EmployeeSettings>(1, 1, {
                filter: `user_email = "${email}"`
            });
            return result.items.length > 0 ? result.items[0] : null;
        } catch (error) {
            return null;
        }
    },

    async saveUserSettings(settings: HR_EmployeeSettings): Promise<void> {
        try {
            const existing = await this.getUserSettings(settings.user_email);
            if (existing) {
                await pb.collection('HR_EmployeeSettings').update(existing.id, settings);
            } else {
                await pb.collection('HR_EmployeeSettings').create(settings);
            }
        } catch (error) {
            console.error("Error saving user settings:", error);
            throw error;
        }
    },

    async sendEmail(to: string[], subject: string, body: string): Promise<void> {
        // STUB: Real implementation would use a server-side hook or an external provider.
        // For migrating, we log this desire to send.
        console.log(`[TimeSheetService] MOCK SEND EMAIL:
         To: ${to.join(', ')}
         Subject: ${subject}
         Body: ${body}
         `);
        return Promise.resolve();
    },

    async approveTimeSheet(headerId: string, supervisorName: string): Promise<void> {
        try {
            await pb.collection('HR_TimeSheetHeaders').update(headerId, {
                status: 'Approved',
                supervisor_signed_by: supervisorName,
                supervisor_signed_date: new Date().toLocaleString()
            });
        } catch (error) {
            console.error("Error approving timesheet:", error);
            throw error;
        }
    },

    async rejectTimeSheet(headerId: string, reason: string): Promise<void> {
        try {
            await pb.collection('HR_TimeSheetHeaders').update(headerId, {
                status: 'Rejected',
                supervisor_signed_by: '',
                employee_signed_by: '',
                employee_signed_date: ''
            });
        } catch (error) {
            console.error("Error rejecting timesheet:", error);
            throw error;
        }
    }
};
