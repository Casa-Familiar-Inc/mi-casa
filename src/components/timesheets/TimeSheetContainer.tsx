import React, { useState, useEffect } from 'react';
import { TimeSheetService } from '../../services/timeSheetService';
import { TimeUtils } from '../../utils/TimeUtils';
import { 
    HR_TimeSheetHeader, 
    HR_TimeSheetLog, 
    HR_CompTimeEntry, 
    HR_EmployeeSettings 
} from '../../types/timesheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateTimeSheetPDF } from '../../utils/TimeSheetPDF';
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
import { Settings, Download } from 'lucide-react';
import { ActionToolbar } from '../common/ActionToolbar';

interface TimeSheetContainerProps {
    userEmail?: string;
}

export const TimeSheetContainer: React.FC<TimeSheetContainerProps> = ({ userEmail }) => {
    const { data: identity } = useGetIdentity<{ email: string, name: string }>();
    const { data: permissions } = usePermissions({}); // { isSupervisor: boolean, jobTitle: string }
    const go = useGo();
    const currentUserEmail = identity?.email || '';
    const currentUserName = identity?.name || '';
    
    // Supervisor logic: Viewing someone else
    const isSupervisorView = !!userEmail && userEmail !== currentUserEmail;
    
    // State
    const [periods, setPeriods] = useState<{key: string, label: string, start: string, end: string}[]>([]);
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
    
    const [logs, setLogs] = useState<HR_TimeSheetLog[]>([]);
    const [compTimeEntries, setCompTimeEntries] = useState<HR_CompTimeEntry[]>([]);
    const [header, setHeader] = useState<HR_TimeSheetHeader | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userSettings, setUserSettings] = useState<HR_EmployeeSettings | null>(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    
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
        default_time_in: '08:00',
        default_lunch_out: '12:00',
        default_lunch_in: '13:00',
        default_time_out: '17:00'
    });

    useEffect(() => {
        if (currentUserEmail) {
           init();
        }
    }, [currentUserEmail, userEmail]);

    const init = async () => {
        setIsLoading(true);
        try {
            // 1. Generate Periods
            const availablePeriods = generatePeriods(12);
            setPeriods(availablePeriods);
            const current = availablePeriods[0];
            setSelectedPeriodKey(current.key);

            // 2. Load Settings
            const settings = await TimeSheetService.getUserSettings(currentUserEmail);
            setUserSettings(settings);

            // 3. Load Data for current period
            await loadTimeSheet(userEmail || currentUserEmail, current.start, current.end, settings || undefined);

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
            await loadTimeSheet(userEmail || currentUserEmail, p.start, p.end, userSettings || undefined);
        }
        setIsLoading(false);
    };

    const loadTimeSheet = async (email: string, start: string, end: string, settings?: HR_EmployeeSettings) => {
        const data = await TimeSheetService.getTimeSheet(email, start);
        if (data) {
            setHeader(data.header);
            setLogs(data.logs);
            setCompTimeEntries(data.compTime);
            setAdditionalInfo(data.header.additional_info || '');
        } else {
            setHeader(null);
            setCompTimeEntries([{ id: '', header: '', date: '', rationale: '' }]); // Start with 1 empty
            setLogs(generateEmptyLogs(start, end, settings));
            setAdditionalInfo('');
        }
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

    const generatePeriods = (count: number) => {
        const list = [];
        let date = new Date();
        // Adjust to start of current
        date.setDate(date.getDate() > 15 ? 16 : 1);

        for (let i = 0; i < count; i++) {
            const y = date.getFullYear();
            const m = date.getMonth();
            const d = date.getDate();
            
            let start = '', end = '', label = '';
            const monthName = date.toLocaleString('default', { month: 'long' });

            if (d <= 15) {
                start = new Date(y, m, 1).toLocaleDateString('en-CA');
                end = new Date(y, m, 15).toLocaleDateString('en-CA');
                label = `${monthName} 1 - 15, ${y}`;
                date = new Date(y, m - 1, 16); // Move back
            } else {
                start = new Date(y, m, 16).toLocaleDateString('en-CA');
                end = new Date(y, m + 1, 0).toLocaleDateString('en-CA');
                label = `${monthName} 16 - End, ${y}`;
                date = new Date(y, m, 1);
            }
            list.push({ key: start, label, start, end });
        }
        return list;
    };

    const generateEmptyLogs = (startStr: string, endStr: string, settings?: HR_EmployeeSettings) => {
        const logs: any[] = [];
        const start = new Date(startStr + 'T00:00:00'); // Ensure local time parsing
        const end = new Date(endStr + 'T00:00:00');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const current = new Date(start);
        while (current <= end) {
             const dateStr = current.toISOString().split('T')[0];
             const dayName = days[current.getDay()];
             const isWeekend = current.getDay() === 0 || current.getDay() === 6;

             logs.push({
                date: dateStr,
                day_name: dayName,
                time_in: isWeekend ? '' : (settings?.default_time_in || '08:00'),
                lunch_out: isWeekend ? '' : (settings?.default_lunch_out || '12:00'),
                lunch_in: isWeekend ? '' : (settings?.default_lunch_in || '13:00'),
                time_out: isWeekend ? '' : (settings?.default_time_out || '17:00'),
                reg_hours: isWeekend ? 0 : 8,
                daily_total: isWeekend ? 0 : 8,
                wd_hours: 0, vac_hours: 0, hol_hours: 0, sick_hours: 0, 
                bereav_hours: 0, ot_hours: 0, jury_duty_hours: 0, unpaid_hours: 0
             });
             current.setDate(current.getDate() + 1);
        }
        return logs;
    };

    const handleLogChange = (index: number, field: keyof HR_TimeSheetLog, value: string) => {
        const newLogs = [...logs];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newLogs[index] as any)[field] = value;

        // Recalculate Logic
        const isTimeField = ['time_in', 'lunch_out', 'lunch_in', 'time_out'].includes(field);
        const isLeaveField = ['wd_hours', 'vac_hours', 'hol_hours', 'sick_hours', 'bereav_hours', 'ot_hours', 'jury_duty_hours', 'unpaid_hours'].includes(field);

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
                Number(l.reg_hours||0) + Number(l.wd_hours||0) + Number(l.vac_hours||0) + 
                Number(l.hol_hours||0) + Number(l.sick_hours||0) + Number(l.bereav_hours||0) + 
                Number(l.ot_hours||0) + Number(l.jury_duty_hours||0) + Number(l.unpaid_hours||0)
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
                    status,
                    additional_info: additionalInfo,
                    employee_signed_by: isEmployeeSigning ? user : header.employee_signed_by,
                    employee_signed_date: isEmployeeSigning ? new Date().toLocaleString() : header.employee_signed_date,
                };
            } else {
                // Create new
                headerData = {
                    id: '', created: '', updated: '', collectionId: '', collectionName: '',
                    employee_email: email,
                    employee_name: user,
                    period_start: p?.start || '',
                    period_end: p?.end || '',
                    status: status,
                    total_hours: totalHours,
                    additional_info: additionalInfo,
                    employee_signed_by: status === 'Submitted' ? user : '',
                    employee_signed_date: status === 'Submitted' ? new Date().toLocaleString() : '',
                    supervisor_signed_by: '',
                    supervisor_signed_date: ''
                };
            }

            await TimeSheetService.saveTimeSheet({
                header: headerData,
                logs: logs,
                compTime: compTimeEntries
            }, email);

            toast.success(`Timesheet ${status === 'Draft' ? 'Saved' : 'Submitted'} successfully`);
            if (p) await loadTimeSheet(email, p.start, p.end, userSettings || undefined);

        } catch (e) {
            console.error(e);
            toast.error("Failed to save timesheet");
        } finally {
            setIsLoading(false);
        }
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

    const handleDownloadPDF = () => {
        if (!header || !logs.length) {
            toast.error("No timesheet data to export");
            return;
        }
        generateTimeSheetPDF(header, logs);
        toast.success("PDF Exported");
    };

    const handleSupervisorApprove = async () => {
        if (!header) return;
        if (!confirm(`Approve timesheet for ${header.employee_name}?`)) return;
        try {
            // First save any edits
            await handleSave(header.status as any); 
            // Then approve
            await TimeSheetService.approveTimeSheet(header.id, currentUserName || 'Supervisor');
            toast.success("Timesheet Approved");
            if (selectedPeriodKey) await handlePeriodChange(selectedPeriodKey);
        } catch(e) { toast.error("Failed to approve"); }
    };

    const handleSupervisorReject = async () => {
        if (!header || !rejectReason) return;
        try {
            await TimeSheetService.rejectTimeSheet(header.id, rejectReason);
            toast.success("Timesheet Returned to Draft");
            setRejectDialogOpen(false);
            if (selectedPeriodKey) await handlePeriodChange(selectedPeriodKey);
        } catch(e) { toast.error("Failed to reject"); }
    };

    // --- CALCULATIONS ---
    const calculateColumnTotal = (field: keyof HR_TimeSheetLog) => {
        return logs.reduce((sum, log) => sum + Number(log[field] || 0), 0).toFixed(2);
    };

    const hoursThisPeriod = logs.reduce((sum, l) => sum + 
        Number(l.reg_hours||0) + Number(l.wd_hours||0) + Number(l.vac_hours||0) + 
        Number(l.hol_hours||0) + Number(l.sick_hours||0) + Number(l.bereav_hours||0) + 
        Number(l.ot_hours||0) + Number(l.jury_duty_hours||0) + Number(l.unpaid_hours||0)
    , 0).toFixed(2);


    if (isLoading && !logs.length) return <div>Loading...</div>;

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
                                value={tempSettings.default_time_in}
                                onChange={(e) => setTempSettings({...tempSettings, default_time_in: e.target.value})}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lunch_out" className="text-right">
                                Lunch Out
                            </Label>
                            <Input
                                id="lunch_out"
                                value={tempSettings.default_lunch_out}
                                onChange={(e) => setTempSettings({...tempSettings, default_lunch_out: e.target.value})}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lunch_in" className="text-right">
                                Lunch In
                            </Label>
                            <Input
                                id="lunch_in"
                                value={tempSettings.default_lunch_in}
                                onChange={(e) => setTempSettings({...tempSettings, default_lunch_in: e.target.value})}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time_out" className="text-right">
                                Time Out
                            </Label>
                            <Input
                                id="time_out"
                                value={tempSettings.default_time_out}
                                onChange={(e) => setTempSettings({...tempSettings, default_time_out: e.target.value})}
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
                         { permissions?.isSupervisor && !isSupervisorView && (
                            <Button variant="secondary" onClick={() => go({ to: '/supervisor' })}>Supervisor Dashboard</Button>
                         )}

                         {/* SUPERVISOR ACTIONS */}
                         {isSupervisorView && header?.status === 'Submitted' && (
                             <>
                                <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>Reject</Button>
                                
                                { !supervisorEditMode ? (
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

                         {/* EMPLOYEE ACTIONS */}
                         {!isSupervisorView && (header?.status === 'Draft' || header?.status === 'Rejected' || !header?.status) && (
                             <>
                                <Button variant="outline" onClick={() => handleSave('Draft')}>Save Draft</Button>
                                <Button onClick={() => handleSave('Submitted')}>Sign & Submit</Button>
                             </>
                         )}

                         {/* PDF */}
                         { showSignatures && header?.status !== 'Submitted' && (
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
                     <div className="text-sm font-semibold">Employee: <span className="font-normal">{header?.employee_name || currentUserName}</span></div>
                     <div className="text-sm font-semibold">Status: <span className={`font-normal ${header?.status === 'Approved' ? 'text-green-600' : ''}`}>{header?.status || 'Draft'}</span></div>
                </div>
                <div className="w-64">
                    <label className="text-xs text-muted-foreground mb-1 block">Select Period</label>
                    <Select value={selectedPeriodKey} onValueChange={handlePeriodChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                            {periods.map(p => (
                                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* STATUS BANNER - Show only if not Draft */}
            { showSignatures && (
                <div className="bg-muted border border-border p-3 text-sm rounded text-muted-foreground">
                    <div><span className="font-bold">Signed by Employee:</span> {header?.employee_signed_by ? `${header.employee_signed_by} on ${header.employee_signed_date}` : 'Not signed'}</div>
                    <div><span className="font-bold">Approved by Supervisor:</span> {header?.supervisor_signed_by ? `${header.supervisor_signed_by} on ${header.supervisor_signed_date}` : 'Not approved'}</div>
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
                                {logs.map((log, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="p-2 text-muted-foreground">{log.date}</TableCell>
                                        <TableCell className="p-2 text-muted-foreground">{log.day_name}</TableCell>
                                        
                                        {/* TIME INPUTS */}
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center ${isReadOnly ? 'bg-muted' : ''}`} value={log.time_in} onChange={(e) => handleLogChange(idx, 'time_in', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center ${isReadOnly ? 'bg-muted' : ''}`} value={log.lunch_out} onChange={(e) => handleLogChange(idx, 'lunch_out', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center ${isReadOnly ? 'bg-muted' : ''}`} value={log.lunch_in} onChange={(e) => handleLogChange(idx, 'lunch_in', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center ${isReadOnly ? 'bg-muted' : ''}`} value={log.time_out} onChange={(e) => handleLogChange(idx, 'time_out', e.target.value)} /></TableCell>
                                        
                                        {/* READ ONLY REG */}
                                        <TableCell className="p-1 font-bold bg-blue-50/30 text-foreground">{log.reg_hours?.toString()}</TableCell>

                                        {/* LEAVE INPUTS */}
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.wd_hours} onChange={(e) => handleLogChange(idx, 'wd_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.vac_hours} onChange={(e) => handleLogChange(idx, 'vac_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.hol_hours} onChange={(e) => handleLogChange(idx, 'hol_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.sick_hours} onChange={(e) => handleLogChange(idx, 'sick_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.bereav_hours} onChange={(e) => handleLogChange(idx, 'bereav_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.ot_hours} onChange={(e) => handleLogChange(idx, 'ot_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.jury_duty_hours} onChange={(e) => handleLogChange(idx, 'jury_duty_hours', e.target.value)} /></TableCell>
                                        <TableCell className="p-1"><Input readOnly={isReadOnly} className={`h-7 text-xs text-center px-1 ${isReadOnly ? 'bg-muted' : ''}`} type="number" value={log.unpaid_hours} onChange={(e) => handleLogChange(idx, 'unpaid_hours', e.target.value)} /></TableCell>
                                    </TableRow>
                                ))}
                                {/* TOTALS ROW */}
                                <TableRow className="font-bold bg-muted/50">
                                    <TableCell colSpan={6} className="p-2 text-right">TOTALS</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('reg_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('wd_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('vac_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('hol_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('sick_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('bereav_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('ot_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('jury_duty_hours')}</TableCell>
                                    <TableCell className="p-2">{calculateColumnTotal('unpaid_hours')}</TableCell>
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
                     <div className="font-bold text-sm mb-2">Comp Time Rationale</div>
                     <div className="grid grid-cols-[150px_1fr] gap-4 mb-2 text-xs font-medium text-muted-foreground">
                         <div>Date</div>
                         <div>Rationale</div>
                     </div>
                     {compTimeEntries.map((entry, idx) => (
                         <div key={idx} className="grid grid-cols-[150px_1fr] gap-4 mb-2">
                             <Input 
                                readOnly={isReadOnly}
                                placeholder="mm/dd/yyyy" 
                                className="h-8"
                                value={entry.date}
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
                     { !isReadOnly && (
                        <Button variant="link" onClick={() => setCompTimeEntries([...compTimeEntries, {id:'', header:'', date:'', rationale:''}])} className="h-6 p-0 text-xs">+ Add Line</Button>
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
