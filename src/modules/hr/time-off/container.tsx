import React, { useState, useEffect, useMemo } from 'react';
import { useGetIdentity, useGo } from '@refinedev/core';
import { TimeOffService } from '../../../services/timeOffService';
import { HR_TimeOffRequest } from '../../../types/timeoff';
import { TimeUtils } from '../../../utils/TimeUtils';
import { generateTimeOffPDF } from '../../../utils/PDFUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Calendar as CalendarIcon, Clock, AlertCircle, ShieldAlert, Trash2, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from '../../../stores/authStore';

interface TimeOffContainerProps {
    requestId?: string;
}

const REQUEST_TYPES = [
    { id: 'WD', label: 'Wellness Day' },
    { id: 'VAC', label: 'Vacation' },
    { id: 'HOL', label: 'Holiday' },
    { id: 'SICK', label: 'Sick Time' },
    { id: 'BER', label: 'Bereavement Leave' },
    { id: 'OT', label: 'Overtime' },
    { id: 'JURY', label: 'Jury Duty' },
    { id: 'UNPD', label: 'Unpaid Leave' }
];

export const TimeOffContainer: React.FC<TimeOffContainerProps> = ({ requestId }) => {
    const { data: identity } = useGetIdentity<{
        email: string;
        name: string;
        departmentId?: string;
    }>();

    const { directReports, userRole } = useAuthStore();
    const go = useGo();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<HR_TimeOffRequest>>({
        employee_name: '',
        today_date: new Date().toISOString().split('T')[0],
        department: '',
        vacation_days_available: 0,
        as_of_date: '',
        num_days_requested: 0,
        total_hours_requested: 0,
        start_date: '',
        end_date: '',
        return_date: '',
        request_type: 'VAC',
        status: 'Draft'
    });
    const [requestMode, setRequestMode] = useState<'FULL_DAYS' | 'SINGLE_DAY' | 'PARTIAL_DAY'>('FULL_DAYS');
    const [overlappingRequests, setOverlappingRequests] = useState<HR_TimeOffRequest[]>([]);

    // Dialog States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<'Approved' | 'Rejected' | null>(null);
    const [statusComments, setStatusComments] = useState('');

    const isOwner = useMemo(() => {
        const owner = !formData.employee_email || (identity?.email && formData.employee_email && identity.email.toLowerCase() === formData.employee_email.toLowerCase());
        return !!owner;
    }, [identity?.email, formData.employee_email, formData.status]);

    const isAuthorizedSupervisor = useMemo(() => {
        if (!requestId || isOwner) return false;
        if (userRole === 'admin' || userRole === 'hr') return true;
        return (directReports || []).some((reportEmail: string) => reportEmail.toLowerCase() === (formData.employee_email || '').toLowerCase());
    }, [requestId, isOwner, userRole, directReports, formData.employee_email]);

    const canEdit = !requestId || (!!isOwner && formData.status === 'Draft');
    const isSupervisorViewing = !!(requestId && isAuthorizedSupervisor);

    // Access check: If it's an existing request and you are neither owner nor authorized supervisor
    const isUnauthorized = !!(requestId && !isOwner && !isAuthorizedSupervisor && formData.employee_email);

    useEffect(() => {
        if (requestId) {
            loadRequest(requestId);
        } else if (identity?.name) {
            // New Request Initialization
            const init = async () => {
                let deptName = '';
                if (identity.departmentId) {
                    try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/organization/departments`, { credentials: 'include' });
                        if (res.ok) {
                            const depts = await res.json();
                            const matches = depts.find((d: any) => d.id === identity.departmentId);
                            if (matches) deptName = matches.name;
                        }
                    } catch (e) {
                        console.error("Failed to fetch department info", e);
                    }
                }
                setFormData(prev => ({
                    ...prev,
                    employee_name: identity.name,
                    department: deptName
                }));
            };
            init();
        }
    }, [requestId, identity]);

    useEffect(() => {
        if (identity?.email && formData.start_date && formData.end_date) {
            fetchOverlappingRequests();
        }
    }, [identity?.email, formData.start_date, formData.end_date]);

    const fetchOverlappingRequests = async () => {
        if (!identity?.email || !formData.start_date || !formData.end_date) return;
        const requests = await TimeOffService.getActiveRequestsByPeriod(
            identity.email,
            formData.start_date,
            formData.end_date
        );
        // Filter out current request if editing
        setOverlappingRequests(requests.filter(r => r.id !== requestId));
    };

    const loadRequest = async (id: string) => {
        setIsLoading(true);
        const data = await TimeOffService.getRequestById(id);
        if (data) {
            setFormData(data);

            // Infer mode
            const startStr = data.start_date || '';
            const endStr = data.end_date || '';
            const hours = Number(data.total_hours_requested || 0);

            if (startStr === endStr) {
                if (hours < 8) setRequestMode('PARTIAL_DAY');
                else setRequestMode('SINGLE_DAY');
            } else {
                setRequestMode('FULL_DAYS');
            }
        }
        setIsLoading(false);
    };

    const handleChange = (field: keyof HR_TimeOffRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const calculateBusinessDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const d1 = new Date(start + 'T00:00:00');
        const d2 = new Date(end + 'T00:00:00');
        let count = 0;
        const cur = new Date(d1);
        while (cur <= d2) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    };

    const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            if (requestMode === 'SINGLE_DAY' || requestMode === 'PARTIAL_DAY') {
                newData.start_date = value;
                newData.end_date = value;
            } else {
                // FULL_DAYS mode
                // Mirror end date if start date changes and end date is empty or was same as start
                if (field === 'start_date' && (!prev.end_date || prev.end_date === prev.start_date)) {
                    newData.end_date = value;
                }

                // Ensure end_date is not before start_date
                if (newData.start_date && newData.end_date && newData.end_date < newData.start_date) {
                    if (field === 'end_date') {
                        toast.error("End date cannot be before start date");
                        return prev;
                    } else {
                        // if start changed to after end, push end to match start
                        newData.end_date = newData.start_date;
                    }
                }
            }

            // Sync return date to end date + 1 business day (simple version: +1 day)
            if (newData.end_date && (!prev.return_date || prev.return_date === prev.end_date)) {
                const nextDay = new Date(newData.end_date + 'T00:00:00');
                nextDay.setDate(nextDay.getDate() + 1);
                // Basic skip weekend for return date
                if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2);
                if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
                newData.return_date = nextDay.toISOString().split('T')[0];
            }

            // Recalculate days
            const days = calculateBusinessDays(newData.start_date || '', newData.end_date || '');
            newData.num_days_requested = days;

            if (requestMode !== 'PARTIAL_DAY') {
                newData.total_hours_requested = days * 8;
            } else {
                // For partial, if it was empty, default to 4 maybe? Or keep existing.
                if (!newData.total_hours_requested) newData.total_hours_requested = 8;
            }

            return newData;
        });
    };

    const handleModeChange = (newMode: string) => {
        const mode = newMode as typeof requestMode;
        setRequestMode(mode);

        setFormData(prev => {
            const upd = { ...prev };
            if (mode === 'SINGLE_DAY') {
                upd.end_date = upd.start_date;
                upd.num_days_requested = 1;
                upd.total_hours_requested = 8;
            } else if (mode === 'PARTIAL_DAY') {
                upd.end_date = upd.start_date;
                upd.num_days_requested = 1;
                // Leave hours as is or default to 4 if at 8
                if (upd.total_hours_requested === 8 || !upd.total_hours_requested) {
                    upd.total_hours_requested = 4;
                }
            } else if (mode === 'FULL_DAYS') {
                // If switching back to full and start/end are same, maybe leave it or reset end?
                const days = calculateBusinessDays(upd.start_date || '', upd.end_date || '');
                upd.num_days_requested = days;
                upd.total_hours_requested = days * 8;
            }
            return upd;
        });
    };

    const validateHourCap = () => {
        if (!formData.start_date || !formData.end_date) return true;

        const start = new Date(formData.start_date + 'T00:00:00');
        const end = new Date(formData.end_date + 'T00:00:00');
        const dailyCap = 8;

        // Map existing hours by date
        const existingHours: Record<string, number> = {};
        overlappingRequests.forEach(req => {
            const reqStart = new Date(req.start_date + 'T00:00:00');
            const reqEnd = new Date(req.end_date + 'T00:00:00');
            const reqHoursTotal = Number(req.total_hours_requested || 0);
            const reqDays = calculateBusinessDays(req.start_date, req.end_date) || 1;
            const hoursPerDay = reqHoursTotal / reqDays;

            const cur = new Date(reqStart);
            while (cur <= reqEnd) {
                if (cur.getDay() !== 0 && cur.getDay() !== 6) {
                    const dateStr = cur.toLocaleDateString('en-CA');
                    existingHours[dateStr] = (existingHours[dateStr] || 0) + hoursPerDay;
                }
                cur.setDate(cur.getDate() + 1);
            }
        });

        // Check new request against cap
        const cur = new Date(start);
        while (cur <= end) {
            if (cur.getDay() !== 0 && cur.getDay() !== 6) {
                const dateStr = cur.toLocaleDateString('en-CA');
                const existing = existingHours[dateStr] || 0;
                const newRequested = requestMode === 'PARTIAL_DAY' ?
                    Number(formData.total_hours_requested || 0) : 8;

                if (existing + newRequested > dailyCap) {
                    toast.error(`Total hours for ${dateStr} would exceed ${dailyCap} (currently has ${existing.toFixed(1)} hrs requested)`);
                    return false;
                }
            }
            cur.setDate(cur.getDate() + 1);
        }
        return true;
    };

    const handleSave = async (status: 'Draft' | 'Pending' = 'Draft') => {
        if (!identity?.email) {
            toast.error("User email not found");
            return;
        }

        // VALIDATION
        if (status === 'Pending') {
            if (!formData.start_date || !formData.end_date) {
                toast.error("Please select start and end dates");
                return;
            }
            if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
                toast.error("The selected date range is invalid (End date is before Start date)");
                return;
            }

            if (requestMode === 'FULL_DAYS' && formData.start_date === formData.end_date) {
                toast.error("FULL DAYS mode requires a range of at least 2 days. For a single day, please use SINGLE DAY mode.");
                return;
            }

            // High-priority: Hour Cap Validation
            if (!validateHourCap()) {
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                status,
                employee_email: identity.email,
                employee_signature: status === 'Pending' ? identity.name : formData.employee_signature,
                employee_signature_date: status === 'Pending' ? new Date().toISOString().split('T')[0] : formData.employee_signature_date
            };

            const savedId = await TimeOffService.saveRequest(payload, identity.email);
            toast.success(`Request ${status === 'Draft' ? 'saved' : 'submitted'} successfully`);

            // Navigate back to list after submission or new save
            if (status === 'Pending' || !requestId) {
                go({ to: `/hr/time-off` });
            } else {
                // Stay on page but refresh data if it's an update to draft
                loadRequest(savedId);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            toast.error("Failed to save request. Please check all required fields.");
        } finally {
            setIsLoading(false);
        }
    };

    const executeDelete = async () => {
        if (!requestId) return;
        setIsDeleteDialogOpen(false);
        setIsLoading(true);
        try {
            await TimeOffService.deleteRequest(requestId);
            toast.success("Request deleted successfully");
            go({ to: '/hr/time-off' });
        } catch (e) {
            console.error("Delete Error:", e);
            toast.error("Failed to delete request");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = (newStatus: 'Approved' | 'Rejected') => {
        setPendingStatusUpdate(newStatus);
        setStatusComments('');
        setIsStatusUpdateDialogOpen(true);
    };

    const executeStatusUpdate = async () => {
        if (!requestId || !pendingStatusUpdate) return;

        setIsStatusUpdateDialogOpen(false);
        setIsLoading(true);
        try {
            await TimeOffService.updateStatus(requestId, pendingStatusUpdate, statusComments || undefined);
            toast.success(`Request ${pendingStatusUpdate.toLowerCase()} successfully`);
            go({ to: `/hr/time-off/approvals` });
        } catch (error) {
            console.error("Update Status Error:", error);
            toast.error("Failed to update status");
        } finally {
            setIsLoading(false);
            setPendingStatusUpdate(null);
            setStatusComments('');
        }
    };

    if (isUnauthorized && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-xl border border-dashed text-center">
                <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-bold">Unauthorized Access</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                    You do not have permission to view or manage this time off request.
                    Only the requester or their direct supervisor can access this information.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => go({ to: '/hr/time-off' })}>
                    Return to List
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* REJECTION ALERT */}
                {formData.status === 'Rejected' && formData.approval_comments && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-red-800">Request Rejected</h4>
                            <p className="text-sm text-red-700 mt-1">
                                Reason: <span className="italic">"{formData.approval_comments}"</span>
                            </p>
                            <p className="text-xs text-red-600 mt-2">Please review the reason above. You may create a new request if needed.</p>
                        </div>
                    </div>
                )}

                {/* APPROVAL WITH COMMENTS ALERT */}
                {formData.status === 'Approved' && formData.approval_comments && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="mt-0.5 bg-green-100 p-1 rounded-full">
                            <CalendarIcon className="w-3 h-3 text-green-700" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-green-800">Request Approved</h4>
                            <p className="text-sm text-green-700 mt-1">
                                Note from Supervisor: <span className="italic">"{formData.approval_comments}"</span>
                            </p>
                        </div>
                    </div>
                )}
                {['Pending', 'Rejected', 'Withdrawn', 'Cancelled'].includes(formData.status || '') && isOwner && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 flex items-center justify-between w-full">
                            <div className="flex flex-col gap-1">
                                <span className="font-medium">
                                    {formData.status === 'Pending'
                                        ? "This request is pending approval. You can move it back to draft if you need to make changes."
                                        : `This request is currently ${formData.status}. To modify it, please move it back to draft status.`
                                    }
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="font-bold flex items-center gap-1"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-300 hover:bg-amber-100 font-bold"
                                    onClick={() => handleSave('Draft')}
                                    disabled={isLoading}
                                >
                                    Move to Draft
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {isSupervisorViewing && formData.status === 'Pending' && (
                    <div className="flex justify-end gap-4 p-4 bg-muted/50 rounded-lg border border-dashed">
                        <Button
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            onClick={() => handleStatusUpdate('Rejected')}
                            disabled={isLoading}
                        >
                            Reject Request
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStatusUpdate('Approved')}
                            disabled={isLoading}
                        >
                            Approve Request
                        </Button>
                    </div>
                )}

                {/* ACTION TITLE + PRINT BUTTON */}
                {requestId && (
                    <div className="flex justify-end mb-2">
                        <Button variant="outline" size="sm" onClick={async () => {
                            await generateTimeOffPDF(formData as HR_TimeOffRequest);
                            toast.success("PDF Exported");
                        }}>
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                    </div>
                )}

                {/* 1. EMPLOYEE PROFILE */}
                <Card>
                    <CardHeader className="bg-muted py-2">
                        <CardTitle className="uppercase text-xs font-bold">Employee Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Employee Name</Label>
                            <Input value={formData.employee_name || ''} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Department</Label>
                            <Input value={formData.department || ''} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Today's Date</Label>
                            <Input type="date" value={formData.today_date ? formData.today_date.split('T')[0] : ''} readOnly className="bg-muted" />
                        </div>
                    </CardContent>
                </Card>

                {overlappingRequests.length > 0 && formData.status !== 'Approved' && (
                    <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-xs font-bold uppercase">Overlapping Requests Found</AlertTitle>
                        <AlertDescription className="text-xs">
                            You already have {overlappingRequests.length} active request(s) for this period.
                            Please ensure the total hours per day does not exceed 8.0 hrs.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 gap-6">
                    {/* 3. REQUEST DATES */}
                    <Card className="w-full">
                        <CardHeader className="bg-black text-white py-2 flex flex-row items-center justify-between">
                            <CardTitle className="uppercase text-xs font-bold">Request Details</CardTitle>
                            <Tabs value={requestMode} onValueChange={handleModeChange} className={`w-auto ${!canEdit ? 'pointer-events-none opacity-80' : ''}`}>
                                <TabsList className="bg-white/10 h-7 p-0.5">
                                    <TabsTrigger value="FULL_DAYS" className="text-[10px] h-6 px-2 data-[state=active]:bg-white data-[state=active]:text-black">
                                        <CalendarDays className="h-3 w-3 mr-1" /> FULL DAYS
                                    </TabsTrigger>
                                    <TabsTrigger value="SINGLE_DAY" className="text-[10px] h-6 px-2 data-[state=active]:bg-white data-[state=active]:text-black">
                                        <CalendarIcon className="h-3 w-3 mr-1" /> SINGLE DAY
                                    </TabsTrigger>
                                    <TabsTrigger value="PARTIAL_DAY" className="text-[10px] h-6 px-2 data-[state=active]:bg-white data-[state=active]:text-black">
                                        <Clock className="h-3 w-3 mr-1" /> PARTIAL
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {requestMode === 'FULL_DAYS' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Starting On</Label>
                                        <Input type="date" value={formData.start_date ? formData.start_date.split('T')[0] : ''} onChange={(e) => handleDateChange('start_date', e.target.value)} disabled={!canEdit} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Ending On</Label>
                                        <Input
                                            type="date"
                                            value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                                            min={formData.start_date}
                                            onChange={(e) => handleDateChange('end_date', e.target.value)}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Date of Request</Label>
                                    <Input type="date" value={formData.start_date ? formData.start_date.split('T')[0] : ''} onChange={(e) => handleDateChange('start_date', e.target.value)} disabled={!canEdit} />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Return to Work Date</Label>
                                <Input type="date" value={formData.return_date ? formData.return_date.split('T')[0] : ''} onChange={(e) => handleChange('return_date', e.target.value)} disabled={!canEdit} />
                            </div>

                            <Separator />

                            <div className={`space-y-4 p-4 rounded-lg border transition-colors ${requestMode === 'PARTIAL_DAY' ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-100 border-slate-200'}`}>
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <Label className={`text-[10px] font-bold uppercase ${requestMode === 'PARTIAL_DAY' ? 'text-blue-700' : 'text-slate-600'}`}>Total Hours Requested</Label>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            {requestMode === 'PARTIAL_DAY' ? 'Enter the exact hours you will be away.' : 'Standard working day = 8.00 hrs.'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.5"
                                            readOnly={!(canEdit && requestMode === 'PARTIAL_DAY')}
                                            className={`w-24 text-right font-bold text-lg h-9 bg-white ${requestMode === 'PARTIAL_DAY' ? 'text-blue-600 border-blue-400 ring-2 ring-blue-100' : 'text-slate-900 border-slate-300 shadow-inner'}`}
                                            value={formData.total_hours_requested}
                                            onChange={(e) => handleChange('total_hours_requested', parseFloat(e.target.value) || 0)}
                                        />
                                        <span className={`font-bold text-sm ${requestMode === 'PARTIAL_DAY' ? 'text-blue-700' : 'text-slate-600'}`}>HRS</span>
                                    </div>
                                </div>

                                <div className={`pt-2 border-t border-dashed flex justify-between items-center text-[10px] font-bold uppercase ${requestMode === 'PARTIAL_DAY' ? 'text-blue-600' : 'text-slate-500'}`}>
                                    <span>Calculated Period:</span>
                                    <span>
                                        {requestMode === 'PARTIAL_DAY' ? 'Partial day request' : `${formData.num_days_requested} Full working days`}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="bg-black text-white py-2">
                        <CardTitle className="text-center uppercase text-sm">Type of Request</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {REQUEST_TYPES.map(type => (
                                <div key={type.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={type.id}
                                        checked={formData.request_type === type.id}
                                        onCheckedChange={() => handleChange('request_type', type.id)}
                                        disabled={!canEdit}
                                    />
                                    <Label htmlFor={type.id} className="cursor-pointer">{type.label.toUpperCase()}</Label>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label>REASON:</Label>
                            <Input value={formData.reason || ''} onChange={(e) => handleChange('reason', e.target.value)} disabled={!canEdit} />
                        </div>

                        <div className="space-y-2">
                            <Label>COMMENTS:</Label>
                            <Textarea value={formData.comments || ''} onChange={(e) => handleChange('comments', e.target.value)} disabled={!canEdit} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="bg-black text-white py-2">
                        <CardTitle className="text-center uppercase text-sm">Employee Certification</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm italic">I understand that time away from work is subject to management approval and company policies.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employee Signature:</Label>
                                <Input value={formData.employee_signature || identity?.name || ''} readOnly className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>Date:</Label>
                                <Input
                                    value={TimeUtils.formatDisplayDateTime(formData.employee_signature_date)}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {(formData.status === 'Approved' || formData.status === 'Rejected') && (
                    <Card>
                        <CardHeader className="bg-black text-white py-2">
                            <CardTitle className="text-center uppercase text-sm">Supervisor Approval</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-center pb-2">
                                <div className={`px-4 py-1.5 rounded-full font-bold uppercase text-xs tracking-wide border ${formData.status === 'Approved'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : 'bg-red-100 text-red-800 border-red-200'
                                    }`}>
                                    Status: {formData.status}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Supervisor Signature:</Label>
                                    <Input value={formData.supervisor_approval_by || ''} readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date:</Label>
                                    <Input
                                        value={TimeUtils.formatDisplayDateTime(formData.supervisor_approval_date)}
                                        readOnly
                                        className="bg-muted"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isSupervisorViewing && canEdit && (
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={() => handleSave('Draft')} disabled={isLoading}>Save Draft</Button>
                        <Button onClick={() => handleSave('Pending')} disabled={isLoading}>Submit Request</Button>
                    </div>
                )}

            </div >

            {/* DELETE CONFIRMATION DIALOG */}
            < AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Request Permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently remove the time off request from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                executeDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isLoading}
                        >
                            {isLoading ? "Deleting..." : "Delete Permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            {/* STATUS UPDATE DIALOG (APPROVE/REJECT) */}
            < Dialog open={isStatusUpdateDialogOpen} onOpenChange={setIsStatusUpdateDialogOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-tight">
                            {pendingStatusUpdate === 'Approved' ? 'Approve Request' : 'Reject Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {pendingStatusUpdate === 'Approved'
                                ? "Are you sure you want to approve this request? You can add optional comments below."
                                : "Please provide a reason or additional comments for rejecting this request."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="comments" className="text-[10px] font-bold uppercase mb-2 block">Comments (Optional)</Label>
                        <Textarea
                            id="comments"
                            placeholder="Enter any relevant information here..."
                            value={statusComments}
                            onChange={(e) => setStatusComments(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStatusUpdateDialogOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={executeStatusUpdate}
                            disabled={isLoading}
                            className={pendingStatusUpdate === 'Approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                        >
                            {isLoading ? 'Processing...' : (pendingStatusUpdate === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    );
};
