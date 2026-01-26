import React, { useState, useEffect } from 'react';
import { useGetIdentity, useGo } from '@refinedev/core';
import { TimeOffService } from '../../../services/timeOffService';
import { HR_TimeOffRequest } from '../../../types/timeoff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface TimeOffContainerProps {
    requestId?: string;
}

const REQUEST_TYPES = [
    'Vacation', 'Personal Leave', 'Bereavement Leave', 'Jury Duty',
    'Unpaid Leave', 'Other', 'Military Leave', 'Family and Medical Leave',
    'Sick Time', 'Comp-Time', 'Request to Earn Comp-Time'
];

export const TimeOffContainer: React.FC<TimeOffContainerProps> = ({ requestId }) => {
    const { data: identity } = useGetIdentity<{ email: string, name: string }>();
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
        request_type: 'Vacation',
        status: 'Draft'
    });

    useEffect(() => {
        if (requestId) {
            loadRequest(requestId);
        } else if (identity?.name) {
            setFormData(prev => ({ ...prev, employee_name: identity.name }));
        }
    }, [requestId, identity]);

    const loadRequest = async (id: string) => {
        setIsLoading(true);
        const data = await TimeOffService.getRequestById(id);
        if (data) {
            setFormData(data);
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

            // Mirror end date if start date changes and end date is empty or was same as start
            if (field === 'start_date' && (!prev.end_date || prev.end_date === prev.start_date)) {
                newData.end_date = value;
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
            newData.total_hours_requested = days * 8;

            return newData;
        });
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
            if (!formData.employee_signature) {
                toast.error("Employee signature is required for submission");
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                status,
                employee_email: identity.email,
                employee_signature_date: formData.employee_signature_date || new Date().toISOString().split('T')[0]
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

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader className="bg-black text-white py-2">
                    <CardTitle className="text-center uppercase text-sm">Employee Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                    <div className="space-y-2">
                        <Label>NAME:</Label>
                        <Input value={formData.employee_name} onChange={(e) => handleChange('employee_name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>TODAY'S DATE:</Label>
                        <Input type="date" value={formData.today_date} onChange={(e) => handleChange('today_date', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>DEPARTMENT:</Label>
                        <Input value={formData.department} onChange={(e) => handleChange('department', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label>VACATION DAYS AVAILABLE:</Label>
                            <Input type="number" value={formData.vacation_days_available} onChange={(e) => handleChange('vacation_days_available', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>AS OF (DATE):</Label>
                            <Input type="date" value={formData.as_of_date} onChange={(e) => handleChange('as_of_date', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label>NUMBER OF DAYS REQUESTED:</Label>
                            <Input type="number" value={formData.num_days_requested} onChange={(e) => handleChange('num_days_requested', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>TOTAL HRS REQUESTED:</Label>
                            <Input type="number" value={formData.total_hours_requested} onChange={(e) => handleChange('total_hours_requested', parseFloat(e.target.value))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label>STARTING ON:</Label>
                            <Input type="date" value={formData.start_date} onChange={(e) => handleDateChange('start_date', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>ENDING ON:</Label>
                            <Input type="date" value={formData.end_date} onChange={(e) => handleDateChange('end_date', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>I WILL RETURN TO WORK ON:</Label>
                        <Input type="date" value={formData.return_date} onChange={(e) => handleChange('return_date', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="bg-black text-white py-2">
                    <CardTitle className="text-center uppercase text-sm">Type of Request</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {REQUEST_TYPES.map(type => (
                            <div key={type} className="flex items-center space-x-2">
                                <Checkbox
                                    id={type}
                                    checked={formData.request_type === type}
                                    onCheckedChange={() => handleChange('request_type', type)}
                                />
                                <Label htmlFor={type} className="cursor-pointer">{type.toUpperCase()}</Label>
                            </div>
                        ))}
                    </div>

                    {formData.request_type === 'Other' && (
                        <div className="space-y-2">
                            <Label>OTHER DETAILS:</Label>
                            <Input value={formData.other_type_details} onChange={(e) => handleChange('other_type_details', e.target.value)} />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>REASON:</Label>
                        <Input value={formData.reason} onChange={(e) => handleChange('reason', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>COMMENTS:</Label>
                        <Textarea value={formData.comments} onChange={(e) => handleChange('comments', e.target.value)} />
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
                            <Input value={formData.employee_signature} onChange={(e) => handleChange('employee_signature', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Date:</Label>
                            <Input type="date" value={formData.employee_signature_date} onChange={(e) => handleChange('employee_signature_date', e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => handleSave('Draft')} disabled={isLoading}>Save Draft</Button>
                <Button onClick={() => handleSave('Pending')} disabled={isLoading}>Submit Request</Button>
            </div>
        </div>
    );
};
