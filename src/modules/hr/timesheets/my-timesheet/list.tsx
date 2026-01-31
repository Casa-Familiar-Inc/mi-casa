import React, { useState, useEffect } from 'react';
import { useGetIdentity, useGo, CanAccess } from '@refinedev/core';
import { TimeSheetService } from '../../../../services/timeSheetService';
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
import { cn } from '@/lib/utils'; // Assuming this exists, or standard string concat

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const TimeSheetList = () => {
    const { data: identity } = useGetIdentity<{ email: string, name: string }>();
    const go = useGo();
    const [headers, setHeaders] = useState<HR_TimeSheetHeader[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Create Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
    const [periods, setPeriods] = useState<{key:string, label:string, start:string, end:string}[]>([]);

    useEffect(() => {
        if (identity?.email) {
            loadData();
        }
    }, [identity]);

    // Update periods whenever headers change
    useEffect(() => {
         setPeriods(generatePeriods(12));
    }, [headers]);

    const loadData = async () => {
        setIsLoading(true);
        // Load My Timesheets
        const myData = await TimeSheetService.getMyTimeSheets();
        setHeaders(myData);
        setIsLoading(false);
    };
    
    // Helper to generate periods (duplicated for now from Container, could be util)
    const generatePeriods = (count: number) => {
        const list = [];
        let date = new Date();
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
                date = new Date(y, m - 1, 16); 
            } else {
                start = new Date(y, m, 16).toLocaleDateString('en-CA');
                end = new Date(y, m + 1, 0).toLocaleDateString('en-CA');
                label = `${monthName} 16 - End, ${y}`;
                date = new Date(y, m, 1);
            }
            list.push({ key: start, label, start, end });
        }
        
        // Filter out existing periods
        if (headers.length > 0) {
            return list.filter(p => !headers.some(h => h.period_start === p.start));
        }
        return list;
    };

    const handleCreate = async () => {
        if (!selectedPeriodKey || !identity?.email) return;
        const p = periods.find(x => x.key === selectedPeriodKey);
        if (!p) return;

        try {
            const id = await TimeSheetService.ensureTimeSheet(identity.email, p.start, p.end, identity.name || 'Employee');
            toast.success("Opening Timesheet...");
            go({ to: `/timesheets/view/${id}` });
        } catch (error) {
            toast.error("Failed to create/open timesheet");
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

    const renderTable = (data: HR_TimeSheetHeader[], showEmployeeName = true) => (
         <Table>
            <TableHeader>
                <TableRow>
                    {showEmployeeName && <TableHead>Employee</TableHead>}
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Signed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(h => (
                    <TableRow key={h.id}>
                        {showEmployeeName && <TableCell className="font-medium">{h.employee_name}</TableCell>}
                        <TableCell>{h.period_start} - {h.period_end}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={getStatusColor(h.status)}>
                                {h.status || 'Draft'}
                            </Badge>
                        </TableCell>
                        <TableCell>{Number(h.total_hours || 0).toFixed(2)}</TableCell>
                        <TableCell>{h.employee_signed_by || '-'}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => go({ to: `/timesheets/view/${h.id}` })}>
                                {showEmployeeName ? 'Review' : 'View'}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <CanAccess 
            resource="TimeSheets" 
            action="list"
            fallback={<div className="p-8 text-center text-red-500 font-bold">No tienes permiso para ver tus timesheets.</div>}
        >
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">My Timesheets</h1>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        Create Timesheet
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div>Loading...</div> : (
                            headers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4 border border-dashed rounded-lg">
                                    <p className="text-muted-foreground text-lg">You haven't created any timesheets yet.</p>
                                    <Button onClick={() => setIsCreateOpen(true)}>
                                        Create Timesheet
                                    </Button>
                                </div>
                            ) : renderTable(headers)
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Timesheet</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <label className="text-sm font-medium mb-2 block">Select Period</label>
                            <Select value={selectedPeriodKey} onValueChange={setSelectedPeriodKey}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map(p => (
                                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!selectedPeriodKey}>Open Timesheet</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </CanAccess>
    );
};
