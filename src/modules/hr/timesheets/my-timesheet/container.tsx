import React, { useState, useEffect } from 'react';
import { TimeSheetService } from '../../../../services/timeSheetService';
import { TimeUtils } from '../../../../utils/TimeUtils';
import {
    HR_TimeSheetHeader,
    HR_TimeSheetLog,
    HR_CompTimeEntry,
    HR_EmployeeSettings
} from '../../../../types/timesheet';
import { HR_TimeOffRequest } from '../../../../types/timeoff';
import { TimeOffService } from '../../../../services/timeOffService';
import { HolidayService } from '../../../../services/HolidayService';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateTimeSheetPDF } from '../../../../utils/TimeSheetPDF';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useGetIdentity, useGo, usePermissions } from '@refinedev/core';
import { toast } from "sonner";
import { Settings, Download, Calendar, Clock } from 'lucide-react';
import { ActionToolbar } from '@/components/common/ActionToolbar';
import { sendGraphEmail, getManagerProfile } from '../../../../utils/graphEmail';
import { authClient } from '../../../../lib/auth';

interface TimeSheetContainerProps {
    userEmail?: string;
    timesheetId?: string;
}

export const TimeSheetContainer: React.FC<TimeSheetContainerProps> = ({ userEmail, timesheetId }) => {
    const { data: identity } = useGetIdentity<{ id: string, email: string, name: string }>();
    const { data: permissions } = usePermissions({}); // { isSupervisor: boolean, jobTitle: string }
    const go = useGo();
    const currentUserEmail = identity?.email || '';
    const currentUserName = identity?.name || '';

    // Supervisor logic: Viewing someone else


    // State
    const [periods, setPeriods] = useState<{ key: string, label: string, start: string, end: string }[]>([]);
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');

    const [logs, setLogs] = useState<HR_TimeSheetLog[]>([]);
    const [compTimeEntries, setCompTimeEntries] = useState<HR_CompTimeEntry[]>([]);
    const [header, setHeader] = useState<HR_TimeSheetHeader | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userSettings, setUserSettings] = useState<HR_EmployeeSettings | null>(null);
    const [additionalInfo, setAdditionalInfo] = useState('');

    // Supervisor logic: Viewing someone else
    // If header is loaded, check the header's employee email.
    // If not loaded yet, fallback to userEmail prop (if provided).
    const isSupervisorView = header
        ? (header.employee_email !== currentUserEmail)
        : (!!userEmail && userEmail !== currentUserEmail);

    // UI State
    const [supervisorEditMode, setSupervisorEditMode] = useState(false);

    // Reject Dialog State (Supervisor)
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempSettings, setTempSettings] = useState<HR_EmployeeSettings>({
        id: '',
        user_email: '',
        default_time_in: '',
        default_lunch_out: '',
        default_lunch_in: '',
        default_time_out: ''
    });


    useEffect(() => {
        if (currentUserEmail) {
            init();
        }
    }, [currentUserEmail, userEmail, timesheetId]);

    const init = async () => {
        setIsLoading(true);
        try {
            // 1. Load Periods (Open Only for Employee, All for Supervisor maybe? Let's defaulting to Open for new)
            // But if we are viewing old timesheet, we need that period to exist in list? 
            // Actually, we just need the "Options" to be selectable. 
            // For now, load Open + Current (if viewing). 
            // Simplest: Load All for now, or Open. 
            // If employee, they can only create for Open.
            const periodsData = await TimeSheetService.getPayPeriods('Open'); 
            const periodsList = periodsData.map((p: any) => ({
                key: p.id, // Using ID as key
                label: p.name,
                start: p.start_date,
                end: p.end_date
            }));
            
            setPeriods(periodsList);

            // 2. Load Settings
            const settingsEmail = userEmail || currentUserEmail;
            const settings = await TimeSheetService.getUserSettings(settingsEmail);
            setUserSettings(settings);

            // 3. Load Data
            if (timesheetId && timesheetId !== 'undefined') {
                // LOAD BY ID (View Mode)
                const data = await TimeSheetService.getTimeSheetById(timesheetId);
                if (data) {
                    setHeader(data.header);

                    const approvedTimeOff = await TimeOffService.getApprovedRequestsByPeriod(settingsEmail, data.header.period_start, data.header.period_end);
                    const companyHolidays = await HolidayService.getHolidaysByRange(data.header.period_start, data.header.period_end);

                    let enrichedLogs: HR_TimeSheetLog[] = [];
                    if (data.logs && data.logs.length > 0) {
                        enrichedLogs = applyTimeOffToLogs(data.logs, approvedTimeOff);
                    } else {
                        // If header exists but logs don't (newly created), generate them
                        const emptyLogs = generateEmptyLogs(data.header.period_start, data.header.period_end);
                        enrichedLogs = applyTimeOffToLogs(emptyLogs, approvedTimeOff);
                    }

                    // Apply Global Company Holidays
                    enrichedLogs = applyCompanyHolidaysToLogs(enrichedLogs, companyHolidays);
                    setLogs(enrichedLogs);

                    setCompTimeEntries(data.compTime);
                    setAdditionalInfo(data.header.additional_info || '');

                    const match = periodsList.find((p: any) => p.start === data.header.period_start);
                    if (match) {
                        setSelectedPeriodKey(match.key);
                    } else {
                        setSelectedPeriodKey('');
                    }
                }
            } else {
                // DEFAULT LOAD (Current Period)
                // Default to the first open period?
                if (periodsList.length > 0) {
                     const current = periodsList[0];
                     setSelectedPeriodKey(current.key);
                     await loadTimeSheet(userEmail || currentUserEmail, current.start, current.end);
                } else {
                    toast.warning("No Open Pay Periods Found. Please contact HR.");
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePeriodChange = async (key: string) => {
        setIsLoading(true);
        setSelectedPeriodKey(key);
        const p = periods.find(x => x.key === key);
        if (p) {
            await loadTimeSheet(userEmail || currentUserEmail, p.start, p.end);
        }
        setIsLoading(false);
    };

    const loadTimeSheet = async (email: string, start: string, end: string) => {
        const data = await TimeSheetService.getTimeSheet(email, start);
        const approvedTimeOff = await TimeOffService.getApprovedRequestsByPeriod(email, start, end);
        const companyHolidays = await HolidayService.getHolidaysByRange(start, end);

        let finalLogs: HR_TimeSheetLog[] = [];

        if (data) {
            setHeader(data.header);
            finalLogs = applyTimeOffToLogs(data.logs, approvedTimeOff);
            setCompTimeEntries(data.compTime);
            setAdditionalInfo(data.header.additional_info || '');
        } else {
            setHeader(null);
            setCompTimeEntries([{ id: '', header: '', date: '', rationale: '' }]); // Start with 1 empty
            const emptyLogs = generateEmptyLogs(start, end);
            finalLogs = applyTimeOffToLogs(emptyLogs, approvedTimeOff);
            setAdditionalInfo('');
        }

        // Apply Global Company Holidays (Template)
        finalLogs = applyCompanyHolidaysToLogs(finalLogs, companyHolidays);
        setLogs(finalLogs);
    };


    const applyTimeOffToLogs = (currentLogs: HR_TimeSheetLog[], requests: HR_TimeOffRequest[]) => {
        const newLogs = [...currentLogs];
        const mapping: Record<string, keyof HR_TimeSheetLog> = {
            'VAC': 'vac',
            'SICK': 'sick',
            'BER': 'ber',
            'JURY': 'jury',
            'UNPD': 'unpd',
            'WD': 'wd',
            'OT': 'ot',
            'HOL': 'hol'
        };

        requests.forEach(req => {
            const field = mapping[req.request_type] || 'unpd';
            const start = new Date(req.start_date + 'T00:00:00');
            const end = new Date(req.end_date + 'T00:00:00');

            newLogs.forEach((log, idx) => {
                const logDate = new Date(log.date + 'T00:00:00');
                if (logDate >= start && logDate <= end) {
                    const isWeekend = logDate.getDay() === 0 || logDate.getDay() === 6;
                    if (isWeekend) return; // Skip weekends for all leaves

                    // Populate hours
                    const hours = req.total_hours_requested > 8 ? 8 : req.total_hours_requested;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any)[field] = hours;

                    // Lock and clear time fields
                    newLogs[idx].time_in = '';
                    newLogs[idx].lunch_out = '';
                    newLogs[idx].lunch_in = '';
                    newLogs[idx].time_out = '';
                    newLogs[idx].reg_hours = 0;
                    newLogs[idx].daily_total = hours;

                    // Add meta to indicate it's locked by TimeOff
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any).is_timeoff_locked = true;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any).locked_field = field;
                }
            });
        });

        return newLogs;
    };

    const applyCompanyHolidaysToLogs = (currentLogs: HR_TimeSheetLog[], holidays: any[]) => {
        const newLogs = [...currentLogs];
        const mapping: Record<string, keyof HR_TimeSheetLog> = {
            'HOL': 'hol',
            'VAC': 'vac',
            'WD': 'wd'
        };

        holidays.forEach(h => {
            const field = mapping[h.concept] || 'hol';

            // Extract YYYY-MM-DD reliably from Date object or ISO string in LOCAL context
            const dateObj = typeof h.date === 'string' ? new Date(h.date.includes('T') ? h.date : h.date + 'T00:00:00') : h.date;
            const hDate = dateObj.toLocaleDateString('en-CA');

            newLogs.forEach((log, idx) => {
                // log.date is already YYYY-MM-DD or needs normalizing
                const logDateObj = typeof log.date === 'string' ? new Date(log.date + 'T00:00:00') : log.date;
                const logDate = logDateObj.toLocaleDateString('en-CA');

                if (logDate === hDate) {
                    // Populate hours (default to 8 for global holidays)
                    const hours = 8;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any)[field] = hours;

                    // Clear and Lock regular time fields
                    newLogs[idx].time_in = '';
                    newLogs[idx].lunch_out = '';
                    newLogs[idx].lunch_in = '';
                    newLogs[idx].time_out = '';
                    newLogs[idx].reg_hours = 0;
                    newLogs[idx].daily_total = hours;

                    // Add meta to indicate it's locked by Company Calendar
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any).is_company_locked = true;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any).holiday_name = h.name;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (newLogs[idx] as any).locked_field = field;
                }
            });
        });

        return newLogs;
    };


    /**
     * READ-ONLY LOGIC:
     * - Default to FALSE (Editable).
     * - If Supervisor View: TRUE (unless supervisorEditMode is ON).
     * - If !Supervisor View (Employee):
     *    - If Status is 'Submitted' -> TRUE (Locked).
     *    - If Status is 'Approved' -> TRUE (Locked).
     *    - if Status is 'Draft' OR 'Rejected' -> FALSE (Editable).
     */
    const isReadOnly = isSupervisorView
        ? !supervisorEditMode
        : (header?.status === 'Submitted' || header?.status === 'Approved');

    // Signatures Visibility
    // show signatures only if NOT Draft (i.e. Submitted, Approved, Rejected)
    const showSignatures = header?.status && header.status !== 'Draft';

    // Removed generatePeriods logic (now fetched from API)

    const generateEmptyLogs = (startStr: string, endStr: string) => {
        const logs: any[] = [];
        const start = new Date(startStr + 'T00:00:00'); // Ensure local time parsing
        const end = new Date(endStr + 'T00:00:00');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toLocaleDateString('en-CA');
            const dayName = days[current.getDay()];

            logs.push({
                date: dateStr,
                day_name: dayName,
                time_in: '',
                lunch_out: '',
                lunch_in: '',
                time_out: '',
                reg_hours: 0,
                daily_total: 0,
                wd: 0, vac: 0, hol: 0, sick: 0,
                ber: 0, ot: 0, jury: 0, unpd: 0
            });
            current.setDate(current.getDate() + 1);
        }
        return logs;
    };

    const handleLogChange = (index: number, field: keyof HR_TimeSheetLog, value: string) => {
        const newLogs = [...logs];

        // Prevent negative values
        let sanitizedValue = value;
        const isLeaveField = ['wd', 'vac', 'hol', 'sick', 'ber', 'ot', 'jury', 'unpd'].includes(field);

        if (isLeaveField) {
            return; // Strict locking: Leave fields can only be updated via Time-Off Requests
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newLogs[index] as any)[field] = sanitizedValue;

        // Recalculate Logic
        const isTimeField = ['time_in', 'lunch_out', 'lunch_in', 'time_out'].includes(field);


        if (isTimeField) {
            const totalStr = TimeUtils.calculateDailyTotal(
                newLogs[index].time_in,
                newLogs[index].lunch_out,
                newLogs[index].lunch_in,
                newLogs[index].time_out
            );
            newLogs[index].daily_total = parseFloat(totalStr);
            newLogs[index].reg_hours = parseFloat(totalStr);
        } else if (isLeaveField) {
            // Logic from SharePoint: If leave is added, clear time fields and daily total? 
            // Or just subtract from REG?
            // "If Leave fields are modified, reset time fields to force re-entry"
            if (parseFloat(value) > 0) {
                newLogs[index].time_in = '';
                newLogs[index].lunch_out = '';
                newLogs[index].lunch_in = '';
                newLogs[index].time_out = '';
                newLogs[index].daily_total = 0; // Or sum of leaves? 
                newLogs[index].reg_hours = 0;
            }
        }

        setLogs(newLogs);
    };

    const handleCompTimeChange = (index: number, field: keyof HR_CompTimeEntry, value: string) => {
        const newEntries = [...compTimeEntries];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newEntries[index] as any)[field] = value;
        setCompTimeEntries(newEntries);
    };

    const handleSave = async (status: 'Draft' | 'Submitted' = 'Draft') => {
        setIsLoading(true);
        try {
            const user = identity?.name || 'Unknown User';
            const email = userEmail || currentUserEmail;

            // Calculate Total Hours properly
            const totalHours = logs.reduce((sum, l) => sum +
                Number(l.reg_hours || 0) + Number(l.wd || 0) + Number(l.vac || 0) +
                Number(l.hol || 0) + Number(l.sick || 0) + Number(l.ber || 0) +
                Number(l.ot || 0) + Number(l.jury || 0) + Number(l.unpd || 0)
                , 0);

            const p = periods.find(x => x.key === selectedPeriodKey);

            let headerData: HR_TimeSheetHeader;

            if (header) {
                // Update existing
                // LOGIC FIX: Only update employee signature if WE are the employee signing it right now.
                // If supervisor is saving edits, keep existing signature.
                const isEmployeeSigning = !isSupervisorView && status === 'Submitted';

                headerData = {
                    ...header,
                    status: status, // This respects the passed status
                    total_hours: totalHours, // Update totals
                    additional_info: additionalInfo,
                    employee_signed_by: isEmployeeSigning ? user : header.employee_signed_by,
                    employee_signed_date: isEmployeeSigning ? new Date().toISOString().replace('T', ' ').split('.')[0].slice(0, 16) : header.employee_signed_date,
                    // IMPORTANT: Do NOT touch employee_email here. It's already in `header`.
                };
            } else {
                // Create new
                headerData = {
                    id: '',
                    user_id: identity?.id || '',
                    created: '',
                    updated: '',
                    collectionId: '',
                    collectionName: '',
                    employee_email: email,
                    employee_name: user,
                    period_start: p?.start || '',
                    period_end: p?.end || '',
                    status: status,
                    total_hours: totalHours,
                    additional_info: additionalInfo,
                    employee_signed_by: status === 'Submitted' ? user : '',
                    employee_signed_date: status === 'Submitted' ? new Date().toISOString().replace('T', ' ').split('.')[0].slice(0, 16) : '',
                    supervisor_signed_by: '',
                    supervisor_signed_date: '',
                    pay_period_id: p?.key || undefined // Pass the ID
                };
            }

            // VALIDATION: Comp Time
            for (const ct of compTimeEntries) {
                // If line has data (rationale or hours - assuming based on requirement "needs date if line added")
                if (ct.rationale && !ct.date) {
                    toast.error("Comp Time Error: Date is required when Rationale is provided.");
                    setIsLoading(false);
                    return;
                }
            }

            // Save to DB
            const savedId = await TimeSheetService.saveTimeSheet({
                header: headerData,
                logs: logs,
                compTime: compTimeEntries
            }, headerData.employee_email); // Pass the CORRECT email (original employee), NOT current user email

            // Local State Update
            // We must setHeader with the data we just saved to ensure UI reflects it immediately
            // without waiting for a reload.
            setHeader({ ...headerData, id: savedId });

            // If we are supervisor saving edits, we likely want to exit edit mode?
            // The button calling this: setSupervisorEditMode(false); handleSave('Submitted');
            // So edit mode is already false.
            // Status remains 'Submitted'.
            // header.employee_email remains as is.
            // isSupervisorView remains true.

            // Re-calc isSupervisorView derived state? 
            // `const isSupervisorView = header ? (header.employee_email !== currentUserEmail) ...`
            // If headerData.employee_email is correct, isSupervisorView stays correct.

            // Do NOT reload full timesheet if we can avoid it, as it might reset state or flicker?
            // "if (p) await loadTimeSheet..." lines 390 causes a reload.
            // It might serve to refresh data from server. 
            // If server data is correct (tested in step 1032), reload is fine.


            // --- EMAIL NOTIFICATIONS ---
            // 1. Employee Submitting -> Notify Supervisor (if we can find one)
            //    Requirement: We need the supervisor's email. 
            //    Currently we filter by "Direct Reports", but we don't store "My Supervisor's Email" on the user record easily without looking it up.
            //    For MVP: We will notify the employee "Submission Successful" via email as a test, 
            //    OR if we have the supervisor email in 'header'? No, header has supervisor_signed_by name.

            // Let's implement at least the "Supervisor Approving" -> Notify Employee (we have employee_email).

            if (status === 'Submitted' && !isSupervisorView) {
                // Employee Submitted. Notify Supervisor.
                try {
                    let managerEmail = '';
                    try {
                        const manager = await getManagerProfile();
                        if (manager && manager.email) managerEmail = manager.email;
                    } catch (err) { console.warn("Graph Manager Fetch Failed", err); }

                    // Fallback to Session Record if Graph fails
                    if (!managerEmail) {
                        const { data: session } = await authClient.getSession();
                        if (session?.user && (session.user as any).managerEmail) {
                            managerEmail = (session.user as any).managerEmail;
                        }
                    }

                    if (managerEmail) {
                        const sent = await sendGraphEmail(
                            managerEmail,
                            `Timesheet Submitted: ${user}`,
                            `<p>${user} has submitted a timesheet for ${p?.start} - ${p?.end}.</p><p>Please review and approve.</p>`
                        );
                        if (sent) toast.success(`Notification sent to supervisor: ${managerEmail}`);
                        else toast.warning("Timesheet submitted, but failed to send email (Token Expired?)");
                    } else {
                        console.warn("Could not find manager to notify.");
                        toast.warning("Timesheet submitted, but no supervisor email found to notify.");
                    }
                } catch (err) {
                    console.error("Failed to notify supervisor", err);
                }
            }

            toast.success(`Timesheet ${status === 'Draft' ? 'Saved' : 'Submitted'} successfully`);

            // Reload by ID if possible (since we have savedId and likely are in view/:id mode)
            // This prevents context switching issues.
            const reloaded = await TimeSheetService.getTimeSheetById(savedId);
            if (reloaded) {
                setHeader(reloaded.header);
                setLogs(reloaded.logs);
                setCompTimeEntries(reloaded.compTime);
                setAdditionalInfo(reloaded.header.additional_info || '');
            } else {
                // Fallback if ID load fails (rare)
                if (p) await loadTimeSheet(headerData.employee_email, p.start, p.end);
            }

        } catch (e) {
            console.error(e);
            toast.error("Failed to save timesheet");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!header || !logs.length) {
            toast.error("No timesheet data to export");
            return;
        }
        generateTimeSheetPDF(header, logs);
        toast.success("PDF Exported");
    };

    const handleOpenSettings = () => {
        if (userSettings) {
            setTempSettings({ ...userSettings });
        } else {
            setTempSettings({
                id: '',
                user_email: currentUserEmail,
                default_time_in: '08:00',
                default_lunch_out: '12:00',
                default_lunch_in: '13:00',
                default_time_out: '17:00'
            });
        }
        setIsSettingsOpen(true);
    };

    const handleSaveSettings = async () => {
        try {
            await TimeSheetService.saveUserSettings(tempSettings);
            setUserSettings(tempSettings);
            setIsSettingsOpen(false);
            toast.success("Settings saved successfully. New logs will use these defaults.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save settings");
        }
    };

    const handleAutoFill = () => {
        if (!userSettings) {
            toast.warning("No settings found. Please configure your default schedule in Settings.");
            return;
        }

        const newLogs = logs.map(log => {
             // Skip if locked (TimeOff / Holiday)
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             if ((log as any).is_timeoff_locked || (log as any).is_company_locked) return log;
             
             // Skip Weekends (Sat/Sun) for auto-fill default
             const d = new Date(log.date.includes('T') ? log.date : log.date + 'T00:00:00');
             if (d.getDay() === 0 || d.getDay() === 6) return log;

             // Don't overwrite if leave exists
             const hasLeave = ['wd','vac','hol','sick','ber','ot','jury','unpd'].some(k => Number((log as any)[k]) > 0);
             if (hasLeave) return log;

             const tIn = userSettings.default_time_in || '';
             const lOut = userSettings.default_lunch_out || '';
             const lIn = userSettings.default_lunch_in || '';
             const tOut = userSettings.default_time_out || '';

             const totalStr = TimeUtils.calculateDailyTotal(tIn, lOut, lIn, tOut);
             
             return {
                 ...log,
                 time_in: tIn,
                 lunch_out: lOut,
                 lunch_in: lIn,
                 time_out: tOut,
                 reg_hours: parseFloat(totalStr),
                 daily_total: parseFloat(totalStr)
             };
        });

        setLogs(newLogs);
        toast.success("Timesheet auto-filled from settings (Mon-Fri)");
    };

    const handleSupervisorApprove = async () => {
        if (!header) return;
        if (!confirm(`Approve timesheet for ${header.employee_name}?`)) return;
        try {
            // First save any edits
            await handleSave(header.status as any);
            // Then approve
            await TimeSheetService.approveTimeSheet(header.id, currentUserName || 'Supervisor');

            // Notify Employee
            if (header.employee_email) {
                const sent = await sendGraphEmail(
                    header.employee_email,
                    "Timesheet Approved",
                    `<p>Your timesheet for ${header.period_start} - ${header.period_end} has been <strong>APPROVED</strong> by ${currentUserName || 'Supervisor'}.</p>`
                );
                if (!sent) toast.warning("Approved, but failed to send email notification.");
            }

            toast.success("Timesheet Approved");
            // Redirect to dashboard (list) as requested
            go({ to: '/timesheets', type: 'push' });
        } catch (e) { toast.error("Failed to approve"); }
    };

    const handleSupervisorReject = async () => {
        if (!header || !rejectReason) return;
        try {
            await TimeSheetService.rejectTimeSheet(header.id, rejectReason);

            // Notify Employee
            if (header.employee_email) {
                const sent = await sendGraphEmail(
                    header.employee_email,
                    "Timesheet Rejected",
                    `<p>Your timesheet for ${header.period_start} - ${header.period_end} has been <strong>REJECTED</strong>.</p><p>Reason: ${rejectReason}</p><p>Please correct and resubmit.</p>`
                );
                if (!sent) toast.warning("Rejected, but failed to send email notification.");
            }

            toast.success("Timesheet Returned to Draft");
            setRejectDialogOpen(false);

            // Redirect to dashboard (list) as requested
            go({ to: '/timesheets', type: 'push' });
        } catch (e) { toast.error("Failed to reject"); }
    };

    // UI Helpers
    const showTimePicker = (e: React.SyntheticEvent<HTMLInputElement>) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((e.currentTarget as any).showPicker) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (e.currentTarget as any).showPicker();
            }
        } catch (error) {
            // Fails silently if browser blocks it (e.g. non-user-triggered focus)
            console.debug("Picker open suppressed", error);
        }
    };

    // --- CALCULATIONS ---
    const calculateColumnTotal = (field: keyof HR_TimeSheetLog) => {
        return logs.reduce((sum, log) => sum + Number(log[field] || 0), 0).toFixed(2);
    };

    const hoursThisPeriod = logs.reduce((sum, l) => sum +
        Number(l.reg_hours || 0) + Number(l.wd || 0) + Number(l.vac || 0) +
        Number(l.hol || 0) + Number(l.sick || 0) + Number(l.ber || 0) +
        Number(l.ot || 0) + Number(l.jury || 0) + Number(l.unpd || 0)
        , 0).toFixed(2);


    if (isLoading && !logs.length) return <div>Loading...</div>;

    const handleSupervisorReopen = async () => {
        if (!header) return;
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/timesheets/${header.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'Submitted',
                    supervisor_signed_by: '',
                    supervisor_signed_date: ''
                }),
            });
            toast.success("Timesheet Unlocked");
            // Reload page to reset state safely
            window.location.reload();
        } catch (e) {
            console.error(e);
            toast.error("Failed to unlock");
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px]">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Employee Settings</DialogTitle>
                        <DialogDescription>
                            Configure your default daily schedule. These times will be used when auto-filling new timesheets.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time_in" className="text-right">
                                Time In
                            </Label>
                            <Input
                                id="time_in"
                                type="time"
                                onClick={showTimePicker}
                                value={tempSettings.default_time_in?.slice(0, 5)}
                                onChange={(e) => setTempSettings({ ...tempSettings, default_time_in: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lunch_out" className="text-right">
                                Lunch Out
                            </Label>
                            <Input
                                id="lunch_out"
                                type="time"
                                onClick={showTimePicker}
                                value={tempSettings.default_lunch_out?.slice(0, 5)}
                                onChange={(e) => setTempSettings({ ...tempSettings, default_lunch_out: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lunch_in" className="text-right">
                                Lunch In
                            </Label>
                            <Input
                                id="lunch_in"
                                type="time"
                                onClick={showTimePicker}
                                value={tempSettings.default_lunch_in?.slice(0, 5)}
                                onChange={(e) => setTempSettings({ ...tempSettings, default_lunch_in: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time_out" className="text-right">
                                Time Out
                            </Label>
                            <Input
                                id="time_out"
                                type="time"
                                onClick={showTimePicker}
                                value={tempSettings.default_time_out?.slice(0, 5)}
                                onChange={(e) => setTempSettings({ ...tempSettings, default_time_out: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSaveSettings}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ACTION TOOLBAR */}
            <ActionToolbar
                title={isSupervisorView ? `Reviewing: ${header?.employee_name || userEmail}` : "Employee Time Sheet"}
                endActions={
                    <>
                        {/* SUPERVISOR ACTIONS */}
                        {isSupervisorView && (
                            <>
                                {(header?.status === 'Submitted') && (
                                    <>
                                        <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>Reject</Button>

                                        {!supervisorEditMode ? (
                                            <Button variant="secondary" onClick={() => setSupervisorEditMode(true)}>Enable Editing</Button>
                                        ) : (
                                            <Button variant="secondary" onClick={() => {
                                                setSupervisorEditMode(false);
                                                handleSave('Submitted');
                                            }}>Save Edits & Lock</Button>
                                        )}

                                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleSupervisorApprove}>Approve</Button>
                                    </>
                                )}

                                {header?.status === 'Approved' && (
                                    <Button variant="outline" className="text-yellow-700 border-yellow-200 hover:bg-yellow-50" onClick={handleSupervisorReopen}>
                                        Unlock / Reopen
                                    </Button>
                                )}
                            </>
                        )}

                        {/* EMPLOYEE ACTIONS - STRICT OWNER ONLY */}
                        {!isSupervisorView && (header?.status === 'Draft' || header?.status === 'Rejected' || !header?.status) && (
                            <>
                                <Button variant="outline" onClick={handleAutoFill} className="mr-2 border-dashed">
                                    <Clock className="w-4 h-4 mr-1"/> Auto-Fill
                                </Button>
                                <Button variant="outline" onClick={() => handleSave('Draft')}>Save Draft</Button>
                                <Button onClick={() => handleSave('Submitted')}>Sign & Submit</Button>
                            </>
                        )}

                        {/* PDF */}
                        {showSignatures && header?.status !== 'Submitted' && (
                            <Button variant="ghost" size="icon" onClick={handleDownloadPDF}>
                                <Download className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        )}

                        {!isSupervisorView && !isReadOnly && (
                            <Button variant="ghost" size="icon" onClick={handleOpenSettings}>
                                <Settings className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        )}
                    </>
                }
            />

            {/* INFO & SELECTOR */}
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-sm font-semibold">Employee: <span className="font-normal">{header?.employee_name || (isSupervisorView ? (userEmail || 'Loading...') : currentUserName)}</span></div>
                    <div className="text-sm font-semibold">Status: <span className={`font-normal ${header?.status === 'Approved' ? 'text-green-600' : ''}`}>{header?.status || 'Draft'}</span></div>
                </div>
                
                <div className="flex items-center gap-2">
                     <span className="text-sm font-medium">Pay Period:</span>
                     <Select value={selectedPeriodKey} onValueChange={async (val) => {
                        setSelectedPeriodKey(val);
                        const p = periods.find(x => x.key === val);
                        if(p) await loadTimeSheet(userEmail || currentUserEmail, p.start, p.end);
                     }}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                            {periods.map((p) => (
                                <SelectItem key={p.key} value={p.key}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                </div>
            </div>

            {/* STATUS BANNER - Show only if not Draft */}
            {showSignatures && (
                <div className="bg-muted border border-border p-3 text-sm rounded text-muted-foreground">
                    <div><span className="font-bold">Signed by Employee:</span> {header?.employee_signed_by ? `${header.employee_signed_by} on ${TimeUtils.formatDisplayDateTime(header.employee_signed_date)}` : 'Not signed'}</div>
                    <div><span className="font-bold">Approved by Supervisor:</span> {header?.supervisor_signed_by ? `${header.supervisor_signed_by} on ${TimeUtils.formatDisplayDateTime(header.supervisor_signed_date)}` : 'Not approved'}</div>
                </div>
            )}

            {/* GRID */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24">Date</TableHead>
                                    <TableHead className="w-20">Day</TableHead>
                                    <TableHead className="w-20 bg-muted/50">In</TableHead>
                                    <TableHead className="w-20 bg-muted/50">L.Out</TableHead>
                                    <TableHead className="w-20 bg-muted/50">L.In</TableHead>
                                    <TableHead className="w-20 bg-muted/50">Out</TableHead>
                                    <TableHead className="w-12 bg-blue-50/50">REG</TableHead>
                                    <TableHead className="w-12">WD</TableHead>
                                    <TableHead className="w-12">VAC</TableHead>
                                    <TableHead className="w-12">HOL</TableHead>
                                    <TableHead className="w-12">SICK</TableHead>
                                    <TableHead className="w-12">BER</TableHead>
                                    <TableHead className="w-12">OT</TableHead>
                                    <TableHead className="w-12">JURY</TableHead>
                                    <TableHead className="w-12">UNPD</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log, idx) => {
                                    const isTimeOffLocked = (log as any).is_timeoff_locked;
                                    const isCompanyLocked = (log as any).is_company_locked;
                                    const isLocked = isTimeOffLocked || isCompanyLocked;
                                    const holidayName = (log as any).holiday_name;

                                    return (
                                        <TableRow
                                            key={idx}
                                            className={`${isTimeOffLocked ? "bg-amber-100/30" : ""} ${isCompanyLocked ? "bg-blue-100/40 border-l-4 border-l-blue-500" : ""}`}
                                            title={isCompanyLocked ? `Company Holiday: ${holidayName}` : ""}
                                        >
                                            <TableCell className="p-2 text-muted-foreground flex items-center gap-1">
                                                {log.date}
                                                {isCompanyLocked && <Calendar className="h-3 w-3 text-blue-500" />}
                                            </TableCell>
                                            <TableCell className="p-2 text-muted-foreground">{log.day_name}</TableCell>

                                            {/* TIME INPUTS - Blocked if ANY Time Off or Company Holiday applied to this day */}
                                            <TableCell className="p-1">
                                                <Input
                                                    type="time"
                                                    onFocus={showTimePicker}
                                                    readOnly={isReadOnly || isLocked}
                                                    className={`h-7 text-xs text-center ${(isReadOnly || isLocked) ? 'bg-muted opacity-60' : ''}`}
                                                    value={log.time_in?.slice(0, 5)}
                                                    onChange={(e) => handleLogChange(idx, 'time_in', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="time"
                                                    onFocus={showTimePicker}
                                                    readOnly={isReadOnly || isLocked}
                                                    className={`h-7 text-xs text-center ${(isReadOnly || isLocked) ? 'bg-muted opacity-60' : ''}`}
                                                    value={log.lunch_out?.slice(0, 5)}
                                                    onChange={(e) => handleLogChange(idx, 'lunch_out', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="time"
                                                    onFocus={showTimePicker}
                                                    readOnly={isReadOnly || isLocked}
                                                    className={`h-7 text-xs text-center ${(isReadOnly || isLocked) ? 'bg-muted opacity-60' : ''}`}
                                                    value={log.lunch_in?.slice(0, 5)}
                                                    onChange={(e) => handleLogChange(idx, 'lunch_in', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="time"
                                                    onFocus={showTimePicker}
                                                    readOnly={isReadOnly || isLocked}
                                                    className={`h-7 text-xs text-center ${(isReadOnly || isLocked) ? 'bg-muted opacity-60' : ''}`}
                                                    value={log.time_out?.slice(0, 5)}
                                                    onChange={(e) => handleLogChange(idx, 'time_out', e.target.value)}
                                                />
                                            </TableCell>

                                            {/* READ ONLY REG */}
                                            <TableCell className="p-1 font-bold bg-blue-50/30 text-foreground">{log.reg_hours?.toString()}</TableCell>

                                            {/* LEAVE INPUTS - STRICTLY BLOCKED (Only via Time-Off Request) */}
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.wd}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.vac}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.hol}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.sick}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.ber}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.ot}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.jury}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    readOnly={true}
                                                    className="h-7 text-xs text-center px-1 bg-amber-50/30"
                                                    type="number" min={0} value={log.unpd}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {/* TOTALS ROW */}
                                <TableRow className="font-bold bg-muted/50">
                                    <TableCell colSpan={6} className="p-2 text-right">TOTALS</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('reg_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('wd')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('vac')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('hol')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('sick')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('ber')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('ot')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('jury')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('unpd')}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* ADDITIONAL INFO */}
            <div>
                <h3 className="font-bold text-sm mb-2">Additional Information</h3>
                <Textarea
                    readOnly={isReadOnly}
                    placeholder={isReadOnly ? "No additional notes" : "Enter any additional notes..."}
                    className="h-20"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                />
            </div>

            {/* BOTTOM SECTION */}
            <div className="flex gap-8 items-start">

                {/* HOURS BOX */}
                <div className="border-2 border-primary w-48 shrink-0 rounded-md overflow-hidden">
                    <div className="bg-muted border-b border-primary text-center text-xs font-bold py-1 text-muted-foreground">
                        HOURS THIS PERIOD
                    </div>
                    <div className="text-3xl font-bold text-center py-4">
                        {hoursThisPeriod}
                    </div>
                </div>

                {/* COMP TIME RATIONALE */}
                <div className="flex-grow">
                    {compTimeEntries.length > 0 && (
                        <>
                            <div className="font-bold text-sm mb-2">Comp Time Rationale</div>
                            <div className="grid grid-cols-[150px_1fr] gap-4 mb-2 text-xs font-medium text-muted-foreground">
                                <div>Date</div>
                                <div>Rationale</div>
                            </div>
                        </>
                    )}
                    {compTimeEntries.map((entry, idx) => (
                        <div key={idx} className="grid grid-cols-[150px_1fr] gap-4 mb-2">
                            <Input
                                readOnly={isReadOnly}
                                type="date"
                                className="h-8"
                                value={entry.date}
                                onFocus={(e) => {
                                    try { e.currentTarget.showPicker(); } catch { }
                                }}
                                onChange={(e) => handleCompTimeChange(idx, 'date', e.target.value)}
                            />
                            <Input
                                readOnly={isReadOnly}
                                placeholder="Enter rationale..."
                                className="h-8"
                                value={entry.rationale}
                                onChange={(e) => handleCompTimeChange(idx, 'rationale', e.target.value)}
                            />
                        </div>
                    ))}
                    {!isReadOnly && (
                        <Button variant="link" onClick={() => setCompTimeEntries([...compTimeEntries, { id: '', header: '', date: '', rationale: '' }])} className="h-6 p-0 text-xs">+ Add Line</Button>
                    )}
                </div>
            </div>

            {/* SUPERVISOR REJECT DIALOG */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Timesheet</DialogTitle>
                        <DialogDescription>
                            Reason for rejection (will be sent to employee):
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Correct errors in..." />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleSupervisorReject}>Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
