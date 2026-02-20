import React, { useState, useEffect } from 'react';
import { TimeSheetService } from '../../../../services/timeSheetService';
import { TimeOffService } from '../../../../services/timeOffService';
import { HR_TimeSheetHeader } from '../../../../types/timesheet';
import { HR_TimeOffRequest } from '../../../../types/timeoff';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useGetIdentity } from '@refinedev/core';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGo } from '@refinedev/core';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { StatsCards } from './components/StatsCards';
import { SupervisorFilters } from './components/SupervisorFilters';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

export const SupervisorDashboard: React.FC = () => {
    const { data: identity } = useGetIdentity<{ id: string; name: string }>();
    const go = useGo();


    // Pagination State
    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const LIMIT = 10;

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");





    // Timesheet State
    const [tsPending, setTsPending] = useState<HR_TimeSheetHeader[]>([]);
    const [tsHistory, setTsHistory] = useState<HR_TimeSheetHeader[]>([]);

    // Time Off State
    const [toPending, setToPending] = useState<HR_TimeOffRequest[]>([]);
    const [toHistory, setToHistory] = useState<HR_TimeOffRequest[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Dialogs & Actions
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean, id: string, type: 'TIMESHEET' | 'TIMEOFF' }>({ open: false, id: '', type: 'TIMESHEET' });
    const [rejectReason, setRejectReason] = useState('');
    const [quickComments, setQuickComments] = useState<Record<string, string>>({}); // For Time Off

    useEffect(() => {
        if (identity?.id) {
            loadSubmissions();
        }
    }, [identity, pendingPage, historyPage]); // Reload on page change

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Pending (Timesheets & Time Off)
            const pTs = await TimeSheetService.getSubmittedTimeSheets(['Submitted'], pendingPage, LIMIT, 'supervised');
            // Filter self out if needed (backend might return self if supervisor is also reporting to self? Unlikely)
            const filteredPTs = pTs.filter(d => d.user_id !== identity?.id);
            setTsPending(filteredPTs);

            const pTo = await TimeOffService.getPendingRequests(pendingPage, LIMIT, 'supervised');
            setToPending(pTo);

            // 2. Fetch History (Timesheets & Time Off)
            const hTs = await TimeSheetService.getSubmittedTimeSheets(['Approved', 'Rejected'], historyPage, LIMIT, 'supervised');
            const filteredHTs = hTs.filter(d => d.user_id !== identity?.id);
            setTsHistory(filteredHTs);

            const hTo = await TimeOffService.getSupervisorHistory(historyPage, LIMIT, 'supervised');
            setToHistory(hTo);

        } catch (e) {
            console.error(e);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    // --- TIMESHEET ACTIONS ---
    const handleApproveTS = async (id: string, employeeName: string) => {
        if (!confirm(`Approve timesheet for ${employeeName}?`)) return;
        try {
            await TimeSheetService.approveTimeSheet(id, identity?.name || 'Supervisor');
            toast.success(`Approved timesheet for ${employeeName}`);
            loadSubmissions();
        } catch (e) {
            toast.error("Failed to approve");
        }
    };

    const handleRejectTSClick = (id: string) => {
        setRejectDialog({ open: true, id, type: 'TIMESHEET' });
        setRejectReason('');
    };

    // --- TIME OFF ACTIONS ---
    const handleCommentChange = (id: string, value: string) => {
        setQuickComments(prev => ({ ...prev, [id]: value }));
    };

    const handleApproveTO = async (id: string) => {
        const comment = quickComments[id] || "";
        try {
            await TimeOffService.updateStatus(id, 'Approved', comment, 'Supervisor');
            toast.success("Time Off Request Approved");
            loadSubmissions();
        } catch (e) {
            toast.error("Failed to approve time off");
        }
    };

    const handleRejectTOClick = (id: string) => {
        const comment = quickComments[id] || "";
        if (comment) {
            confirmRejectTO(id, comment);
        } else {
            setRejectDialog({ open: true, id, type: 'TIMEOFF' });
            setRejectReason('');
        }
    };

    const confirmRejectTO = async (id: string, reason: string) => {
        try {
            await TimeOffService.updateStatus(id, 'Rejected', reason, 'Supervisor');
            toast.success("Time Off Request Rejected");
            setRejectDialog({ open: false, id: '', type: 'TIMEOFF' });
            loadSubmissions();
        } catch (e) {
            toast.error("Failed to reject time off");
        }
    };

    // --- SHARED REJECT CONFIRM ---
    const handleConfirmReject = async () => {
        if (!rejectReason) return toast.error("Please provide a reason");

        if (rejectDialog.type === 'TIMESHEET') {
            try {
                await TimeSheetService.rejectTimeSheet(rejectDialog.id, rejectReason);
                toast.success("Timesheet returned to Draft");
                setRejectDialog(prev => ({ ...prev, open: false }));
                loadSubmissions();
            } catch (e) {
                toast.error("Failed to reject timesheet");
            }
        } else {
            confirmRejectTO(rejectDialog.id, rejectReason);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
            case 'Submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // --- RENDERERS ---

    const renderTimesheetTable = (data: HR_TimeSheetHeader[], isPending: boolean) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.employee_name}</TableCell>
                        <TableCell>{item.period_start} - {item.period_end}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={getStatusColor(item.status)}>
                                {item.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{Number(item.total_hours || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="secondary" onClick={() => go({ to: `/timesheets/view/${item.id}` })}>
                                <Eye className="w-3 h-3 mr-1" /> {isPending ? 'Review' : 'View'}
                            </Button>
                            {isPending && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => handleRejectTSClick(item.id)}>Reject</Button>
                                    <Button size="sm" onClick={() => handleApproveTS(item.id, item.employee_name)}>Approve</Button>
                                </>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const renderTimeOffTable = (data: HR_TimeOffRequest[], isPending: boolean) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    {isPending && <TableHead className="w-[200px]">Comments</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="font-medium">{item.employee_name}</div>
                        </TableCell>
                        <TableCell>
                            <div className="text-sm">{item.start_date}</div>
                            <div className="text-xs text-muted-foreground">to {item.end_date}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary">{item.request_type}</Badge>
                            <div className="text-xs text-muted-foreground mt-1">{item.total_hours_requested} hrs</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={getStatusColor(item.status)}>
                                {item.status}
                            </Badge>
                        </TableCell>
                        {isPending && (
                            <TableCell>
                                <Input
                                    placeholder="Add note..."
                                    className="h-8 text-xs"
                                    value={quickComments[item.id] || ""}
                                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                />
                            </TableCell>
                        )}
                        <TableCell className="text-right space-x-2">
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="secondary" onClick={() => go({ to: `/hr/time-off/view/${item.id}` })}>
                                    <Eye className="w-3 h-3 mr-1" /> View
                                </Button>
                                {isPending && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handleRejectTOClick(item.id)}>
                                            <XCircle className="w-3 h-3 mr-1" /> Reject
                                        </Button>
                                        <Button size="sm" onClick={() => handleApproveTO(item.id)}>
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                        </Button>
                                    </>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const renderPagination = (page: number, setPage: (p: number) => void, hasMore: boolean) => (
        <Pagination className="mt-4">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                        className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                </PaginationItem>
                <PaginationItem>
                    <Button variant="ghost" disabled>{page}</Button>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); if (hasMore) setPage(page + 1); }}
                        className={!hasMore ? "pointer-events-none opacity-50" : ""}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );

    if (isLoading && pendingPage === 1 && historyPage === 1) return <div className="p-8 text-center text-muted-foreground">Loading Dashboard...</div>;

    const hasMorePending = tsPending.length === LIMIT || toPending.length === LIMIT; // Rough check
    const hasMoreHistory = tsHistory.length === LIMIT || toHistory.length === LIMIT;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Supervisor Console</h1>
                <SupervisorFilters search={searchTerm} onSearchChange={setSearchTerm} />
            </div>

            {/* STATS */}
            <StatsCards
                pendingTimesheets={tsPending.length}
                pendingTimeOff={toPending.length}
            />

            <Tabs defaultValue="pending" className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
                    <TabsTrigger value="history">Approval History</TabsTrigger>
                </TabsList>

                {/* --- PENDING --- */}
                <TabsContent value="pending" className="space-y-6 mt-6">
                    {/* Pending Timesheets */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pending Timesheets</CardTitle>
                            <CardDescription>Review and approve submitted timesheets.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {tsPending.length === 0 ? <p className="text-sm text-muted-foreground italic">No pending timesheets.</p> : renderTimesheetTable(tsPending, true)}
                        </CardContent>
                    </Card>

                    {/* Pending Time Off */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pending Time Off Requests</CardTitle>
                            <CardDescription>Review and approve employee leave requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {toPending.length === 0 ? <p className="text-sm text-muted-foreground italic">No pending time off requests.</p> : renderTimeOffTable(toPending, true)}
                        </CardContent>
                    </Card>

                    {renderPagination(pendingPage, setPendingPage, hasMorePending)}
                </TabsContent>

                {/* --- HISTORY --- */}
                <TabsContent value="history" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Timesheet History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tsHistory.length === 0 ? <p className="text-sm text-muted-foreground italic">No history found.</p> : renderTimesheetTable(tsHistory, false)}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Time Off History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {toHistory.length === 0 ? <p className="text-sm text-muted-foreground italic">No history found.</p> : renderTimeOffTable(toHistory, false)}
                        </CardContent>
                    </Card>

                    {renderPagination(historyPage, setHistoryPage, hasMoreHistory)}
                </TabsContent>
            </Tabs>

            {/* REJECTION DIALOG */}
            <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject {rejectDialog.type === 'TIMESHEET' ? 'Timesheet' : 'Time Off Request'}</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejection. This will be sent to the employee.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Textarea
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmReject}>Reject & Return</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
