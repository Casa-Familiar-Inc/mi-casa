import { getSP } from "../pnpjsConfig";
import { SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/fields";
import "@pnp/sp/views";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/profiles";
import "@pnp/sp/site-users/web";
import { ITimeLogEntry } from "../components/ITimeLogProps";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { MSGraphClientV3 } from "@microsoft/sp-http";

const LIST_NAME = "TimeSheetLogs";

export interface ITimeSheetItem {
    Title: string; // Employee Name
    EmployeeEmail: string; // Employee Email
    PeriodStart: string;
    PeriodEnd: string;
    Date: string;
    DayName: string;
    TimeIn: string;
    LunchOut: string;
    LunchIn: string;
    TimeOut: string;
    RegHours: number;
    WdHours: number;
    VacHours: number;
    HolHours: number;
    SickHours: number;
    BereavHours: number;
    OtHours: number;
    JuryDutyHours: number;
    UnpaidHours: number;
    DailyTotal: number;
    CompTimeRationale: string;
    CompTimeDate: string;
    Status: string;
    EmployeeSignedBy: string;
    EmployeeSignedDate: string;
    SupervisorSignedBy: string;
    SupervisorSignedDate: string;

    AdditionalInformation?: string;
    TimeSheetId?: string; // New relational link
}

export interface ITimeSheetHeader {
    Id?: number;
    Title: string; // Composite: Email|PeriodStart
    EmployeeEmail: string;
    EmployeeName: string;
    PeriodStart: string;
    PeriodEnd: string;
    Status: string;
    EmployeeSignedBy: string;
    EmployeeSignedDate: string;
    SupervisorSignedBy: string;
    SupervisorSignedDate: string;
    AdditionalInformation: string;
    TotalHours: number;
}

export interface ICompTimeEntryItem {
    Title: string; // Email
    TimeSheetId: string;
    Date: string;
    Rationale: string;
}

export interface IEmployeeSettings {
    DefaultTimeIn: string;
    DefaultLunchOut: string;
    DefaultLunchIn: string;
    DefaultTimeOut: string;
}

export class TimeLogService {
    private _sp: SPFI;
    private _context: WebPartContext;

    constructor(context: WebPartContext) {
        this._context = context;
        this._sp = getSP(context);
    }


    public async ensureRelationalLists(): Promise<void> {
        try {
            // 1. Ensure Header List
            const headerListName = "TimeSheetHeaders";
            const headerListEnsure = await this._sp.web.lists.ensure(headerListName);
            const headerList = headerListEnsure.list;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ensureField = async (list: any, name: string, type: 'Text' | 'Number' | 'MultilineText'): Promise<void> => {
                try {
                    await list.fields.getByInternalNameOrTitle(name)();
                } catch {
                    if (type === 'Text') await list.fields.addText(name);
                    if (type === 'Number') await list.fields.addNumber(name);
                    if (type === 'MultilineText') await list.fields.addMultilineText(name);
                }
            };

            await ensureField(headerList, "EmployeeEmail", 'Text');
            await ensureField(headerList, "EmployeeName", 'Text');
            await ensureField(headerList, "PeriodStart", 'Text');
            await ensureField(headerList, "PeriodEnd", 'Text');
            await ensureField(headerList, "Status", 'Text');
            await ensureField(headerList, "EmployeeSignedBy", 'Text');
            await ensureField(headerList, "EmployeeSignedDate", 'Text');
            await ensureField(headerList, "SupervisorSignedBy", 'Text');
            await ensureField(headerList, "SupervisorSignedDate", 'Text');
            await ensureField(headerList, "AdditionalInformation", 'MultilineText');
            await ensureField(headerList, "TotalHours", 'Number');

            // 2. Ensure Logs List (Modified)
            // leveraging existing LIST_NAME "TimeSheetLogs"
            const logListEnsure = await this._sp.web.lists.ensure(LIST_NAME);
            const logList = logListEnsure.list;
            await ensureField(logList, "TimeSheetId", 'Text');

            // Restore legacy fields ensuring to prevent "Field Not Found" errors
            await ensureField(logList, "EmployeeEmail", 'Text');
            await ensureField(logList, "PeriodStart", 'Text');
            await ensureField(logList, "PeriodEnd", 'Text');
            await ensureField(logList, "Date", 'Text');
            await ensureField(logList, "DayName", 'Text');
            await ensureField(logList, "TimeIn", 'Text');
            await ensureField(logList, "LunchOut", 'Text');
            await ensureField(logList, "LunchIn", 'Text');
            await ensureField(logList, "TimeOut", 'Text');
            await ensureField(logList, "RegHours", 'Number');
            await ensureField(logList, "WdHours", 'Number');
            await ensureField(logList, "VacHours", 'Number');
            await ensureField(logList, "HolHours", 'Number');
            await ensureField(logList, "SickHours", 'Number');
            await ensureField(logList, "BereavHours", 'Number');
            await ensureField(logList, "OtHours", 'Number');
            await ensureField(logList, "JuryDutyHours", 'Number');
            await ensureField(logList, "UnpaidHours", 'Number');
            await ensureField(logList, "DailyTotal", 'Number');
            await ensureField(logList, "CompTimeRationale", 'MultilineText');
            await ensureField(logList, "CompTimeDate", 'Text');
            await ensureField(logList, "AdditionalInformation", 'MultilineText');
            await ensureField(logList, "Status", 'Text');
            await ensureField(logList, "EmployeeSignedBy", 'Text');
            await ensureField(logList, "EmployeeSignedDate", 'Text');
            await ensureField(logList, "SupervisorSignedBy", 'Text');
            await ensureField(logList, "SupervisorSignedDate", 'Text');

            // 3. Ensure Comp Time List
            const compListEnsure = await this._sp.web.lists.ensure("CompTimeEntries");
            const compList = compListEnsure.list;
            await ensureField(compList, "TimeSheetId", 'Text');
            await ensureField(compList, "Date", 'Text');
            await ensureField(compList, "Rationale", 'MultilineText');

        } catch (e) {
            console.error("Error ensuring relational lists:", e);
        }
    }

    public async saveTimeSheet(
        employeeName: string,
        employeeEmail: string,
        periodStart: string,
        periodEnd: string,
        logs: ITimeLogEntry[],
        rationale: string, // LEGACY/Dual-use: Will parse to save entries
        compDate: string,
        additionalInfo: string,
        status: string,
        empSignedBy: string,
        empSignedDate: string,
        supSignedBy: string,
        supSignedDate: string
    ): Promise<void> {

        await this.ensureRelationalLists(); // Auto-provision and Hide

        const compositeKey = `${employeeEmail}|${periodStart}`;
        const headersList = this._sp.web.lists.getByTitle("TimeSheetHeaders");

        // 1. Find or Create Header
        const existingHeaders = await headersList.items
            .filter(`Title eq '${compositeKey}'`)();

        let headerId = -1;
        const totalHours = logs.reduce((sum, log) => {
            const getVal = (v: string | undefined): number => parseFloat(v || '0');
            return sum +
                getVal(log.reg) +
                getVal(log.wd) +
                getVal(log.vac) +
                getVal(log.hol) +
                getVal(log.sick) +
                getVal(log.bereav) +
                getVal(log.ot) +
                getVal(log.juryDuty) +
                getVal(log.unpaid);
        }, 0);

        const headerData = {
            Title: compositeKey,
            EmployeeEmail: employeeEmail,
            EmployeeName: employeeName,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            Status: status || 'Draft',
            EmployeeSignedBy: empSignedBy || '',
            EmployeeSignedDate: empSignedDate || '',
            SupervisorSignedBy: supSignedBy || '',
            SupervisorSignedDate: supSignedDate || '',
            AdditionalInformation: additionalInfo || '',
            TotalHours: totalHours
        };

        if (existingHeaders.length > 0) {
            headerId = existingHeaders[0].Id;
            await headersList.items.getById(headerId).update(headerData);
        } else {
            const added = await headersList.items.add(headerData);
            headerId = added.data.Id;
        }

        const strHeaderId = headerId.toString();

        // 2. Save Logs (Children)
        // Cleanup old logs for this header first (robustness)
        const logsList = this._sp.web.lists.getByTitle(LIST_NAME);
        // We can filter by TimeSheetId if it was previously saved relationally, 
        // OR by Period/Email for migration, but let's stick to TimeSheetId for new architecture.
        // For transition, we might duplicate: cleanup by TimeSheetId.
        const oldLogs = await logsList.items.filter(`TimeSheetId eq '${strHeaderId}'`)();

        // NOTE: If this is the first time saving relationally, there might be old logs without ID. 
        // We'll migrate them: delete legacy logs for this period/user too
        const legacyLogs = await logsList.items.filter(`EmployeeEmail eq '${employeeEmail}' and PeriodStart eq '${periodStart}'`)();
        // Combine (using Set to avoid double-delete if logic overlaps)
        const idsToDelete = new Set([...oldLogs.map(i => i.Id), ...legacyLogs.map(i => i.Id)]);

        // Batch delete is cleaner, but let's loop
        const uniqueIds = Array.from(idsToDelete);
        for (const id of uniqueIds) {
            await logsList.items.getById(id).delete();
        }

        // Add new logs
        for (const log of logs) {
            await logsList.items.add({
                Title: employeeName, // Legacy
                EmployeeEmail: employeeEmail, // Legacy
                PeriodStart: periodStart, // Legacy
                PeriodEnd: periodEnd,
                Date: log.date,
                DayName: log.dayName,
                TimeIn: log.timeIn,
                LunchOut: log.lunchOut,
                LunchIn: log.lunchIn,
                TimeOut: log.timeOut,
                RegHours: parseFloat(log.reg || '0'),
                WdHours: parseFloat(log.wd || '0'),
                VacHours: parseFloat(log.vac || '0'),
                HolHours: parseFloat(log.hol || '0'),
                SickHours: parseFloat(log.sick || '0'),
                BereavHours: parseFloat(log.bereav || '0'),
                OtHours: parseFloat(log.ot || '0'),
                JuryDutyHours: parseFloat(log.juryDuty || '0'),
                UnpaidHours: parseFloat(log.unpaid || '0'),
                DailyTotal: parseFloat(log.dailyTotal || '0'),
                TimeSheetId: strHeaderId, // Link to Parent
                // Legacy fields 'Status', 'EmployeeSignedBy' etc are NOT saved here anymore.
                // Status is saved to be safe for now or we can omit it if desired. 
                // User asked to remove them.
                Status: status || 'Draft'
                // Removed: CompTimeRationale, CompTimeDate, AdditionalInformation, Signatures
            });
        }

        // 3. Save Comp Time Entries (Children)
        const compList = this._sp.web.lists.getByTitle("CompTimeEntries");
        const oldComp = await compList.items.filter(`TimeSheetId eq '${strHeaderId}'`)();
        for (const item of oldComp) {
            await compList.items.getById(item.Id).delete();
        }

        // Parse rationale param (JSON or String)
        let entries: { rationale: string, date: string }[] = [];
        try {
            if (rationale.trim().startsWith('[')) {
                entries = JSON.parse(rationale);
            } else if (rationale) {
                entries = [{ rationale: rationale, date: compDate }];
            }
        } catch {
            entries = [{ rationale: rationale, date: compDate }];
        }

        for (const entry of entries) {
            if (entry.rationale || entry.date) {
                await compList.items.add({
                    Title: employeeEmail,
                    TimeSheetId: strHeaderId,
                    Date: entry.date,
                    Rationale: entry.rationale
                });
            }
        }
    }

    public async getTimeSheet(employeeEmail: string, periodStart: string): Promise<ITimeSheetItem[]> {
        try {
            await this.ensureRelationalLists(); // Auto-provision and Hide

            // 1. Try to get Header
            const compositeKey = `${employeeEmail}|${periodStart}`;
            const headers = await this._sp.web.lists.getByTitle("TimeSheetHeaders").items
                .filter(`Title eq '${compositeKey}'`)();

            if (headers.length > 0) {
                const header = headers[0];
                const headerId = header.Id;

                // 2. Get Children (Logs)
                const logs = await this._sp.web.lists.getByTitle(LIST_NAME).items
                    .filter(`TimeSheetId eq '${headerId}'`)();

                // 3. Get CompTime (to structure properly)
                const compTime = await this._sp.web.lists.getByTitle("CompTimeEntries").items
                    .filter(`TimeSheetId eq '${headerId}'`)();

                // 4. Merge Data (Reconstruct flat structure for UI)
                // We map the Logs to ITimeSheetItem and inject header data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const compTimeJson = JSON.stringify(compTime.map((c: any) => ({ rationale: c.Rationale, date: c.Date })));

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return logs.map((log: any) => ({
                    ...log,
                    // Inject Header Data
                    Status: header.Status,
                    EmployeeSignedBy: header.EmployeeSignedBy,
                    EmployeeSignedDate: header.EmployeeSignedDate,
                    SupervisorSignedBy: header.SupervisorSignedBy,
                    SupervisorSignedDate: header.SupervisorSignedDate,
                    AdditionalInformation: header.AdditionalInformation,
                    // Inject Comp Time (into every row? or just handle in UI? UI expects it in first row usually)
                    CompTimeRationale: compTimeJson,
                    CompTimeDate: compTime.length > 0 ? compTime[0].Date : ''
                }));
            } else {
                // FALLBACK: Legacy Read (Pre-Relational)
                const items = await this._sp.web.lists.getByTitle(LIST_NAME).items
                    .filter(`EmployeeEmail eq '${employeeEmail}' and PeriodStart eq '${periodStart}'`)();
                return items;
            }

        } catch (e) {
            console.error(e);
            return [];
        }
    }

    public async getSubmittedTimeSheets(): Promise<ITimeSheetItem[]> {
        try {
            await this.ensureRelationalLists();
            // Fetch Headers that are Submitted
            const headers = await this._sp.web.lists.getByTitle("TimeSheetHeaders").items
                .select('*') // Force all fields to resolve "undefined" issues
                .filter("Status eq 'Submitted'")
                .orderBy("PeriodStart", false)();

            // Map Header to ITimeSheetItem-like structure for Dashboard
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return headers.map((h: any) => ({
                Title: h.EmployeeName || h.EmployeeEmail, // Display Name prefers Name
                EmployeeEmail: h.EmployeeEmail,
                PeriodStart: h.PeriodStart,
                PeriodEnd: h.PeriodEnd,
                Status: h.Status,
                EmployeeSignedDate: h.EmployeeSignedDate,
                // Other fields optional for dashboard list
            } as ITimeSheetItem));

        } catch (e) {
            console.error(e);
            return [];
        }
    }

    public async uploadTimeSheetPDF(libraryName: string, folderPath: string, fileName: string, content: Blob): Promise<string> {
        try {
            // Ensure the library exists
            await this.ensureLibrary(libraryName);

            // 1. Ensure folder structure exists
            // folderPath is relative to the library, e.g. "2024/October/Period 1"
            // We need to construct server relative path: /sites/siteName/LibraryName/2024...

            // Get Library Root Folder URL first to be safe
            const library = this._sp.web.lists.getByTitle(libraryName);
            const rootFolder = await library.rootFolder();
            const libraryUrl = rootFolder.ServerRelativeUrl;

            const pathSegments = folderPath.split('/').filter(p => p);
            let currentRelPath = libraryUrl;

            for (const segment of pathSegments) {
                const parentFolder = this._sp.web.getFolderByServerRelativePath(currentRelPath);
                currentRelPath = `${currentRelPath}/${segment}`;

                try {
                    await this._sp.web.getFolderByServerRelativePath(currentRelPath)();
                } catch {
                    // Create if missing
                    await parentFolder.addSubFolderUsingPath(segment);
                }
            }

            // 2. Upload file
            const folder = this._sp.web.getFolderByServerRelativePath(currentRelPath);
            // Use addChunked for v4 (works for small files too and is reliable)
            // Cast to any to handle potential type mismatch (IFileInfo vs IFileAddResult)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const file: any = await folder.files.addChunked(fileName, content, { Overwrite: true });

            // 3. Return URL
            // If it returns IFileInfo, it has ServerRelativeUrl directly.
            // If it returns IFileAddResult, it has data.ServerRelativeUrl.
            return file.ServerRelativeUrl || file.data?.ServerRelativeUrl;
        } catch (e) {
            console.error("Error uploading PDF:", e);
            throw e;
        }
    }

    public async ensureLibrary(name: string): Promise<void> {
        try {
            await this._sp.web.lists.ensure(name, name, 101, true); // 101 = Document Library
        } catch (e) {
            console.error("Error ensuring library:", e);
        }
    }

    public async getUserDepartment(): Promise<string> {
        try {
            const profile = await this._sp.profiles.myProperties();
            const department = profile.UserProfileProperties.find((p: { Key: string, Value: string }) => p.Key === "Department");
            return department ? department.Value : "";
        } catch (e) {
            console.error("Error fetching user department:", e);
            return "";
        }
    }

    public async getDirectReports(): Promise<string[]> {
        try {
            const profile = await this._sp.profiles.myProperties();
            const directReportsProp = profile.DirectReports;

            if (directReportsProp && Array.isArray(directReportsProp)) {
                return directReportsProp.map(report => {
                    const parts = report.split('|');
                    return parts.length > 2 ? parts[2] : report;
                });
            }
            return [];
        } catch (e) {
            console.error("Error fetching direct reports:", e);
            return [];
        }
    }

    public async ensureSettingsList(): Promise<void> {
        const listName = "EmployeeSettings";
        try {
            const listEnsure = await this._sp.web.lists.ensure(listName);
            const list = listEnsure.list;
            const ensureField = async (name: string): Promise<void> => {
                try {
                    await list.fields.getByInternalNameOrTitle(name)();
                } catch {
                    await list.fields.addText(name);
                }
            };

            // Hidden: true removed per user request

            await ensureField("DefaultTimeIn");
            await ensureField("DefaultLunchOut");
            await ensureField("DefaultLunchIn");
            await ensureField("DefaultTimeOut");
        } catch (e) {
            console.error("Error ensureSettingsList:", e);
        }
    }

    public async getUserSettings(email: string): Promise<IEmployeeSettings | undefined> {
        try {
            await this.ensureSettingsList();
            const items = await this._sp.web.lists.getByTitle("EmployeeSettings").items
                .filter(`Title eq '${email}'`)();
            if (items.length > 0) {
                return {
                    DefaultTimeIn: items[0].DefaultTimeIn,
                    DefaultLunchOut: items[0].DefaultLunchOut,
                    DefaultLunchIn: items[0].DefaultLunchIn,
                    DefaultTimeOut: items[0].DefaultTimeOut
                };
            }
            return undefined;
        } catch (e) {
            console.error("Error getUserSettings:", e);
            return undefined;
        }
    }

    public async saveUserSettings(email: string, settings: IEmployeeSettings): Promise<void> {
        try {
            await this.ensureSettingsList();
            const list = this._sp.web.lists.getByTitle("EmployeeSettings");
            const items = await list.items.filter(`Title eq '${email}'`)();

            if (items.length > 0) {
                // Update existing
                await list.items.getById(items[0].Id).update({
                    DefaultTimeIn: settings.DefaultTimeIn,
                    DefaultLunchOut: settings.DefaultLunchOut,
                    DefaultLunchIn: settings.DefaultLunchIn,
                    DefaultTimeOut: settings.DefaultTimeOut
                });
            } else {
                // Create new
                await list.items.add({
                    Title: email,
                    DefaultTimeIn: settings.DefaultTimeIn,
                    DefaultLunchOut: settings.DefaultLunchOut,
                    DefaultLunchIn: settings.DefaultLunchIn,
                    DefaultTimeOut: settings.DefaultTimeOut
                });
            }
        } catch (e) {
            console.error("Error saveUserSettings:", e);
            throw e;
        }
    }
    public async getManagerEmail(): Promise<string> {
        try {
            const profile = await this._sp.profiles.myProperties();
            const manager = profile.UserProfileProperties.find((p: { Key: string, Value: string }) => p.Key === "Manager");
            // Manager value is usually "domain\username", we need to Resolve it to get email or hope it matches.
            // Actually ExtendedManagers or such might be better, or standard 'Manager' property.
            // PnP 'myProperties' returns all properties.
            // The value of 'Manager' property is usually the login name.
            if (manager && manager.Value) {
                // We need to get the email for this login name
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const user: any = await this._sp.web.ensureUser(manager.Value);
                return user.data.Email;
            }
            return "";
        } catch (e) {
            console.error("Error fetching manager email:", e);
            return "";
        }
    }

    public async sendEmail(to: string[], subject: string, body: string, cc?: string[]): Promise<void> {
        if (!to || to.length === 0) return;

        try {
            const client: MSGraphClientV3 = await this._context.msGraphClientFactory.getClient("3");

            const message = {
                message: {
                    subject: subject,
                    body: {
                        contentType: "Text",
                        content: body
                    },
                    toRecipients: to.map(email => ({
                        emailAddress: {
                            address: email
                        }
                    })),
                    ccRecipients: cc ? cc.map(email => ({
                        emailAddress: {
                            address: email
                        }
                    })) : []
                },
                saveToSentItems: false
            };

            // Use content-type: HTML for body if it contains HTML tags
            if (body.indexOf("<") > -1) {
                message.message.body.contentType = "HTML";
            }

            await client.api('/me/sendMail').post(message);
            console.log("Email sent successfully (Graph) to:", to);
        } catch (e) {
            console.error("Error sending email (Graph):", e);
            throw e;
        }
    }
}
