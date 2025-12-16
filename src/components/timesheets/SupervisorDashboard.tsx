import React, { useState, useEffect } from 'react';
import { TimeSheetService } from '../../services/timeSheetService';
import { HR_TimeSheetHeader } from '../../types/timesheet';
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
import { useGetIdentity } from '@refinedev/core';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const SupervisorDashboard: React.FC = () => {
    const { data: identity } = useGetIdentity<{ name: string }>();
    const [submissions, setSubmissions] = useState<HR_TimeSheetHeader[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean, id: string }>({ open: false, id: '' });
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            // Service handles secure filtering now
            const data = await TimeSheetService.getSubmittedTimeSheets();
            console.log(data);
            setSubmissions(data);
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

    if (isLoading) return <div>Loading Dashboard...</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                    {submissions.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No pending timesheets found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Total Hours</TableHead>
                                    <TableHead>Signed By</TableHead>
                                    <TableHead>Date Signed</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {submissions.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.employee_name}</TableCell>
                                        <TableCell>{item.period_start} - {item.period_end}</TableCell>
                                        <TableCell>{item.total_hours.toFixed(2)}</TableCell>
                                        <TableCell>{item.employee_signed_by}</TableCell>
                                        <TableCell>{item.employee_signed_date}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {/* Could add 'View Details' later which opens read-only TimeSheetContainer */}
                                            <Button size="sm" variant="outline" onClick={() => handleRejectClick(item.id)}>Reject</Button>
                                            <Button size="sm" variant="secondary" onClick={() => window.location.href = `/timesheets/review/${item.employee_email}`}>View</Button>
                                            <Button size="sm" onClick={() => handleApprove(item.id, item.employee_name)}>Approve</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Timesheet</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejection. The timesheet will be returned to 'Draft' status for the employee to correct.
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
