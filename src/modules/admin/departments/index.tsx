import React, { useEffect, useState } from 'react';
import { OrganizationService, Department } from '@/services/organizationService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Building } from 'lucide-react';
import { toast } from 'sonner';
import { DepartmentDialog } from './DepartmentDialog';

export const DepartmentsList: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState<Department | undefined>(undefined);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        setIsLoading(true);
        const data = await OrganizationService.getAllDepartments();
        setDepartments(data);
        setIsLoading(false);
    };

    const handleCreate = () => {
        setSelectedDept(undefined);
        setIsDialogOpen(true);
    };

    const handleEdit = (dept: Department) => {
        setSelectedDept(dept);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this department?")) return;
        try {
            await OrganizationService.deleteDepartment(id);
            toast.success("Department deleted");
            loadDepartments();
        } catch (error) {
            toast.error("Failed to delete department");
        }
    };

    const handleSave = async (data: any) => {
        try {
            if (selectedDept) {
                await OrganizationService.updateDepartment(selectedDept.id, data);
                toast.success("Department updated");
            } else {
                await OrganizationService.createDepartment(data);
                toast.success("Department created");
            }
            loadDepartments();
        } catch (error) {
            console.error(error);
            toast.error("Operation failed");
            throw error;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
                    <p className="text-muted-foreground">Manage departments and reporting structure.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Departments</CardTitle>
                    <CardDescription>
                        Match these names with your Entra ID (Azure AD) groups/fields for auto-sync.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Aliases (Auto-Sync)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : departments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No departments found. Add one to get started.</TableCell>
                                </TableRow>
                            ) : (
                                departments.map((dept) => (
                                    <TableRow key={dept.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-muted-foreground" />
                                                {dept.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{dept.code || '-'}</TableCell>
                                        <TableCell>
                                            {dept.managerName ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{dept.managerName}</span>
                                                    <span className="text-xs text-muted-foreground">{dept.managerEmail}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(dept.aliases || []).map(alias => (
                                                    <Badge key={alias} variant="outline" className="text-xs">{alias}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(dept.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DepartmentDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
                department={selectedDept} 
                onSave={handleSave} 
            />
        </div>
    );
};
