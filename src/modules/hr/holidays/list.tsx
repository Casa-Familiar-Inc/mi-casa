import React, { useState, useEffect } from 'react';
import { HolidayService } from '../../../services/HolidayService';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const HolidayList: React.FC = () => {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<any>({
        date: new Date().toLocaleDateString('en-CA'),
        concept: 'HOL',
        name: '',
        description: ''
    });

    const fetchHolidays = async () => {
        setIsLoading(true);
        const data = await HolidayService.getHolidays();
        setHolidays(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const handleSave = async () => {
        if (!editingHoliday.name || !editingHoliday.date) {
            toast.error("Name and Date are required");
            return;
        }
        setIsSaving(true);
        try {
            await HolidayService.saveHoliday(editingHoliday);
            toast.success("Holiday saved successfully");
            setIsDialogOpen(false);
            setEditingHoliday({
                date: new Date().toLocaleDateString('en-CA'),
                concept: 'HOL',
                name: '',
                description: ''
            });
            fetchHolidays();
        } catch (error) {
            toast.error("Failed to save holiday");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this company holiday?")) return;
        try {
            await HolidayService.deleteHoliday(id);
            toast.success("Holiday deleted");
            fetchHolidays();
        } catch (error) {
            toast.error("Failed to delete holiday");
        }
    };

    const conceptLabels: Record<string, string> = {
        HOL: 'Holiday',
        VAC: 'Company Vacation',
        WD: 'Wellness Day'
    };

    return (
        <div className="p-6 w-full mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Company Calendar</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add Company Date
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Company Off-Day</DialogTitle>
                            <DialogDescription>
                                This date will be automatically applied to all employee timesheets.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={editingHoliday.date}
                                    onChange={(e) => setEditingHoliday({ ...editingHoliday, date: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Event Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Christmas Day"
                                    value={editingHoliday.name}
                                    onChange={(e) => setEditingHoliday({ ...editingHoliday, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Concept</Label>
                                <Select
                                    value={editingHoliday.concept}
                                    onValueChange={(v) => setEditingHoliday({ ...editingHoliday, concept: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HOL">Holiday (Paid)</SelectItem>
                                        <SelectItem value="VAC">Company Vacation</SelectItem>
                                        <SelectItem value="WD">Wellness Day (Company-wide)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc">Description (Optional)</Label>
                                <Textarea
                                    id="desc"
                                    value={editingHoliday.description}
                                    onChange={(e) => setEditingHoliday({ ...editingHoliday, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Add to Calendar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="bg-muted/50">
                    <CardTitle className="text-sm uppercase font-bold text-muted-foreground">Global Off-Days</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-10">Loading calendar...</div>
                    ) : holidays.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground italic border border-dashed rounded-lg">
                            No company dates configured yet.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holidays.map((h: any) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="font-medium">
                                            {(() => {
                                                const d = h.date.includes('T') ? new Date(h.date) : new Date(h.date + 'T00:00:00');
                                                return d.toLocaleDateString();
                                            })()}
                                        </TableCell>
                                        <TableCell className="font-bold">{h.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-200">
                                                {conceptLabels[h.concept] || h.concept}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-xs">{h.description || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(h.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
