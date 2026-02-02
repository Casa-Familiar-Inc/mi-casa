import React, { useState, useEffect } from 'react';
import { useGetIdentity, useGo, CanAccess } from '@refinedev/core';
import { TimeOffService } from '../../../services/timeOffService';
import { HR_TimeOffRequest } from '../../../types/timeoff';
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
import { Trash2, Eye, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const TimeOffList = () => {
    const { data: identity } = useGetIdentity<{ email: string, name: string }>();
    const go = useGo();
    const [requests, setRequests] = useState<HR_TimeOffRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (identity?.email) {
            loadData(identity.email);
        }
    }, [identity]);

    const loadData = async (email: string) => {
        setIsLoading(true);
        const myData = await TimeOffService.getMyRequests(email);
        setRequests(myData);
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
            return;
        }

        try {
            await TimeOffService.deleteRequest(id);
            toast.success("Request deleted successfully");
            if (identity?.email) {
                loadData(identity.email);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete request");
        }
    };

    const handleWithdraw = async (id: string) => {
        if (!window.confirm("Are you sure you want to withdraw this request?")) {
            return;
        }

        try {
            await TimeOffService.updateStatus(id, 'Withdrawn', undefined, 'Employee');
            toast.success("Request withdrawn successfully");
            if (identity?.email) {
                loadData(identity.email);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to withdraw request");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Pending': return 'bg-blue-100 text-blue-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Withdrawn': return 'bg-amber-100 text-amber-800';
            case 'Cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <CanAccess 
            resource="TimeOff" 
            action="list"
            fallback={<div className="p-8 text-center text-red-500 font-bold">No tienes permiso para ver tus solicitudes.</div>}
        >
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">My Time Off Requests</h1>
                    <CanAccess resource="TimeOff" action="create">
                        <Button onClick={() => go({ to: '/hr/time-off/new' })}>
                            New Request
                        </Button>
                    </CanAccess>
                </div>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div>Loading...</div> : (
                        requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4 border border-dashed rounded-lg">
                                    <p className="text-muted-foreground text-lg">You haven't created any requests yet.</p>
                                    <CanAccess resource="TimeOff" action="create">
                                        <Button onClick={() => go({ to: '/hr/time-off/new' })}>
                                            Create Request
                                        </Button>
                                    </CanAccess>
                                </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Days/Hours</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{r.request_type}</TableCell>
                                            <TableCell>{r.start_date} - {r.end_date}</TableCell>
                                            <TableCell>{r.num_days_requested} days / {r.total_hours_requested} hrs</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(r.status)}>
                                                    {r.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                <CanAccess resource="TimeOff" action="show">
                                                    <Button variant="ghost" size="sm" onClick={() => go({ to: `/hr/time-off/view/${r.id}` })}>
                                                        <Eye className="h-4 w-4 mr-1" /> View
                                                    </Button>
                                                </CanAccess>
                                                {(r.status === 'Draft' || r.status === 'Pending') && (
                                                    <CanAccess resource="TimeOff" action="delete">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDelete(r.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                                                        </Button>
                                                    </CanAccess>
                                                )}
                                                {(r.status === 'Pending' || r.status === 'Approved') && (
                                                    <CanAccess resource="TimeOff" action="update">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                                            onClick={() => handleWithdraw(r.id)}
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-1" /> Retract
                                                        </Button>
                                                    </CanAccess>
                                                )}
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
        </CanAccess>
    );
};
