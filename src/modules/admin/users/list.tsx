
import React from 'react';
import { useGo } from "@refinedev/core";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// Define Screens we can assign
// Define Screens we can assign (Fallback/Initial)
// Define Screens we can assign (Fallback/Initial)
const AVAILABLE_SCREENS = [
    { id: 'loans', label: 'Loans' },
    { id: 'TimeSheets', label: 'TimeSheets' },
    { id: 'TimeOff', label: 'Time Off' },
    { id: 'Supervisor', label: 'Supervisor Dashboard' },
    { id: 'employees', label: 'Employee Management' },
    { id: 'it-category', label: 'IT Settings' }
];

import { EmployeesService } from '../../../services/employeesService';
import { OrganizationService } from '../../../services/organizationService';

const InviteUserForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const [email, setEmail] = React.useState('');
    const [role, setRole] = React.useState('user');
    const [departmentId, setDepartmentId] = React.useState('');
    const [departments, setDepartments] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        OrganizationService.getAllDepartments().then(setDepartments);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await EmployeesService.inviteUser({ email, role, departmentId });
            toast.success("Invitation sent!", {
                description: res.previewUrl ? <a href={res.previewUrl} target="_blank" className="underline">Click here for preview (Dev Only)</a> : undefined,
                duration: 10000
            });
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="hr">Supervisor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {departments.map((d: any) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
        </form>
    );
};

export const UserList: React.FC = () => {
    const [users, setUsers] = React.useState<any[]>([]);
    const [availableScreens, setAvailableScreens] = React.useState<{id: string, label: string}[]>(AVAILABLE_SCREENS);
    const [isLoading, setIsLoading] = React.useState(true);
    const go = useGo();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employees`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } else {
                console.error("Failed to fetch users", res.status);
            }
            
            // Fetch Screens
            const resScreens = await fetch(`${import.meta.env.VITE_API_URL}/api/employees/screens`, {
                 credentials: 'include'
            });
             if (resScreens.ok) {
                 const data = await resScreens.json();
                 setAvailableScreens(data);
             }

        } catch (e) {
            console.error("Error fetching users", e);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const [editingUser, setEditingUser] = React.useState<any>(null);
    const [role, setRole] = React.useState('user');
    const [screens, setScreens] = React.useState<string[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSyncing, setIsSyncing] = React.useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employees/sync`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Sync failed");
            const data = await res.json();
            toast.success(`Sync Complete: ${data.created} created, ${data.updated} updated.`);
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error("Failed to sync users from Entra ID");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setRole(user.role || 'user');
        try {
            setScreens(user.allowedScreens ? JSON.parse(user.allowedScreens) : []);
        } catch(e) { setScreens([]); }
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setIsSaving(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/employees/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, allowedScreens: screens }),
                credentials: 'include'
            });
            setEditingUser(null);
            fetchUsers();
        } catch (e) {
            console.error(e);
            alert("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleScreen = (id: string, checked: boolean) => {
        setScreens(prev => 
            checked 
            ? [...prev, id]
            : prev.filter(s => s !== id)
        );
    };

    const roleLabels: Record<string, string> = {
        admin: 'Admin',
        hr: 'Supervisor',
        user: 'Employee'
    };

    if (isLoading) return <div>Loading users...</div>;

    return (
        <div className="p-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>User Management</CardTitle>
                    <CardTitle>User Management</CardTitle>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Invite User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite New User</DialogTitle>
                                <DialogDescription>Send an invitation email to a new employee.</DialogDescription>
                            </DialogHeader>
                            <InviteUserForm onSuccess={fetchUsers} />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Allowed Screens</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Office</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                            {roleLabels[user.role] || user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {user.allowedScreens ? JSON.parse(user.allowedScreens).join(', ') : '-'}
                                    </TableCell>
                                    <TableCell>{user.phoneNumber || '-'}</TableCell>
                                    <TableCell>{user.officeLocation || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => go({ to: `/admin/users/edit/${user.id}` })}>
                                                Edit Profile
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
