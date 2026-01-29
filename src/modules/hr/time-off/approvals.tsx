import React, { useState, useEffect } from 'react';
import { useGetIdentity, useGo } from '@refinedev/core';
import { TimeOffService } from '../../../services/timeOffService';
import { HR_TimeOffRequest } from '../../../types/timeoff';
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
import { CheckCircle2, XCircle, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export const TimeOffApprovals = () => {
    const { data: identity } = useGetIdentity<{ email: string, name: string, role: string, isSupervisor: boolean }>();
    const go = useGo();
    const [requests, setRequests] = useState<HR_TimeOffRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});

    useEffect(() => {
        if (identity) {
            loadData();
        }
    }, [identity]);

    const loadData = async () => {
        setIsLoading(true);
        const pending = await TimeOffService.getPendingRequests();
        setRequests(pending);
        setIsLoading(false);
    };

    const handleAction = async (id: string, action: 'Approved' | 'Rejected') => {
        const comment = approvalComments[id] || "";
        if (action === 'Rejected' && !comment) {
            toast.error("Please provide a reason for rejection in the comments field.");
            return;
        }

        try {
            await TimeOffService.updateStatus(id, action, comment, 'Supervisor');
            toast.success(`Request ${action.toLowerCase()} successfully`);
            loadData();
        } catch (error: any) {
            toast.error(error.message || `Failed to ${action.toLowerCase()} request`);
        }
    };

    const handleCommentChange = (id: string, value: string) => {
        setApprovalComments(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Time Off Approvals</h1>
                    <p className="text-muted-foreground">Review and manage pending employee time-off requests.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>Actions taken here will be logged and notify the employee.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div>Loading...</div> : (
                        requests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 border border-dashed rounded-lg">
                                <CheckCircle2 className="h-12 w-12 text-green-500/20" />
                                <p className="text-muted-foreground text-lg">Incredible! No pending requests to review.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Hours</TableHead>
                                        <TableHead className="w-[300px]">Decision Comments</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <div className="font-medium">{r.employee_name}</div>
                                                <div className="text-xs text-muted-foreground">{r.employee_email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{r.request_type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{r.start_date}</div>
                                                <div className="text-xs text-muted-foreground">to {r.end_date}</div>
                                            </TableCell>
                                            <TableCell className="font-semibold">{r.total_hours_requested} hrs</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <Input
                                                        placeholder="Add approval/rejection note..."
                                                        className="h-8 text-xs"
                                                        value={approvalComments[r.id] || ""}
                                                        onChange={(e) => handleCommentChange(r.id, e.target.value)}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => go({ to: `/hr/time-off/view/${r.id}` })}>
                                                        <Eye className="h-3 w-3 mr-1" /> Details
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleAction(r.id, 'Rejected')}
                                                    >
                                                        <XCircle className="h-3 w-3 mr-1" /> Reject
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleAction(r.id, 'Approved')}
                                                    >
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
