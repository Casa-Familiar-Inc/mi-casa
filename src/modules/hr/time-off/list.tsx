import React, { useState, useEffect } from 'react';
import { useGetIdentity, useGo } from '@refinedev/core';
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">My Time Off Requests</h1>
                <Button onClick={() => go({ to: '/hr/time-off/new' })}>
                    New Request
                </Button>
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
                                <Button onClick={() => go({ to: '/hr/time-off/new' })}>
                                    Create Request
                                </Button>
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
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => go({ to: `/hr/time-off/view/${r.id}` })}>
                                                    View
                                                </Button>
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
