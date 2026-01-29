import React, { useState, useEffect } from 'react';
import { TimeSheetService } from '../../../../services/timeSheetService';
import { authClient } from '../../../../lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { HR_TimeSheetHeader } from '../../../../types/timesheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useGetIdentity, usePermissions } from '@refinedev/core';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGo } from '@refinedev/core';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const SupervisorDashboard: React.FC = () => {
    const { data: identity } = useGetIdentity<{ id: string; name: string }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: permissions, isLoading: isLoadingPermissions } = usePermissions<any>({});
    const go = useGo();
    const [pending, setPending] = useState<HR_TimeSheetHeader[]>([]);
    const [history, setHistory] = useState<HR_TimeSheetHeader[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean, id: string }>({ open: false, id: '' });
    const [rejectReason, setRejectReason] = useState('');

    const permissionsStr = JSON.stringify(permissions);
    const processedRef = React.useRef(false);

    useEffect(() => {
        if (identity?.id) {
            loadSubmissions();
        }
    }, [identity]);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            // Fetch ALL statuses
            // Pending = Submitted
            // History = Approved, Rejected
            const allData = await TimeSheetService.getSubmittedTimeSheets(['Submitted', 'Approved', 'Rejected']);

            // Filter out my own timesheets (I shouldn't approve my own)
            const filteredData = allData.filter(d => d.user_id !== identity?.id);

            setPending(filteredData.filter(d => d.status === 'Submitted'));
            setHistory(filteredData.filter(d => d.status === 'Approved' || d.status === 'Rejected'));

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string, employeeName: string) => {
        if (!confirm(`Approve timesheet for ${employeeName}?`)) return;
        try {
            await TimeSheetService.approveTimeSheet(id, identity?.name || 'Supervisor');
            toast.success(`Approved timesheet for ${employeeName}`);
            loadSubmissions();
        } catch (e) {
            toast.error("Failed to approve");
        }
    };

    const handleRejectClick = (id: string) => {
        setRejectDialog({ open: true, id });
        setRejectReason('');
    };

    const handleConfirmReject = async () => {
        if (!rejectReason) return toast.error("Please provide a reason");
        try {
            await TimeSheetService.rejectTimeSheet(rejectDialog.id, rejectReason);
            toast.success("Timesheet returned to Draft");
            setRejectDialog({ open: false, id: '' });
            loadSubmissions();
        } catch (e) {
            toast.error("Failed to reject");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Submitted': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderTable = (data: HR_TimeSheetHeader[], isPending: boolean) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Signed By</TableHead>
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
                        <TableCell>{item.employee_signed_by}</TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="secondary" onClick={() => go({ to: `/timesheets/view/${item.id}` })}>
                                {isPending ? 'Review' : 'View'}
                            </Button>
                            {isPending && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => handleRejectClick(item.id)}>Reject</Button>
                                    <Button size="sm" onClick={() => handleApprove(item.id, item.employee_name)}>Approve</Button>
                                </>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    if (isLoading) return <div>Loading Dashboard...</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pending Approvals ({pending.length})</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card>
                        <CardHeader><CardTitle>Pending Reviews</CardTitle></CardHeader>
                        <CardContent>
                            {pending.length === 0 ? <p className="text-center py-8 text-muted-foreground">No pending items.</p> : renderTable(pending, true)}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
                        <CardContent>
                            {history.length === 0 ? <p className="text-center py-8 text-muted-foreground">No history found.</p> : renderTable(history, false)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Timesheet</DialogTitle>
                        <DialogDescription>
                            Please provide a reason.
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
                        <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmReject}>Reject & Return</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
