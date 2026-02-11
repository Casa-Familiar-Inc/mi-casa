
import React from 'react';
import { useNavigation, useLogout, CanAccess } from "@refinedev/core";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api"; // Added import

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// Define Screens we can assign
// Define Screens we can assign (Fallback/Initial)
const AVAILABLE_SCREENS = [
    { id: 'TimeSheets', label: 'TimeSheets' },
    { id: 'TimeOff', label: 'Time Off' },
    { id: 'Supervisor', label: 'Supervisor Dashboard' },
    { id: 'employees', label: 'User Management' },
    { id: 'departments', label: 'Departments' },
    { id: 'it-category', label: 'IT Settings' },
    { id: 'HRAudit', label: 'HR Audit & Reports' }
];

export const UserList: React.FC = () => {
    const { mutate: logout } = useLogout();
    const [users, setUsers] = React.useState<any[]>([]);
    const [departments, setDepartments] = React.useState<any[]>([]);
    const [availableScreens, setAvailableScreens] = React.useState<{ id: string, label: string }[]>(AVAILABLE_SCREENS);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/employees');
            setUsers(Array.isArray(res.data) ? res.data : []);

            // Fetch Departments
            const resDepts = await api.get('/organization/departments');
            setDepartments(resDepts.data);

            // Fetch Screens
            const resScreens = await api.get('/employees/screens');
            setAvailableScreens(resScreens.data);

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
    const [departmentId, setDepartmentId] = React.useState<string>("");
    const [screens, setScreens] = React.useState<string[]>([]);
    const [employeeSettings, setEmployeeSettings] = React.useState<any>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSyncing, setIsSyncing] = React.useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await api.post('/employees/sync');
            const data = res.data;
            toast.success(`Sync Complete: ${data.created} created, ${data.updated} updated.`);
            fetchUsers();
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes("EXPIRED_TOKEN") || error.message?.includes("lifetime validation failed")) {
                toast.error("Your Microsoft session has expired. Redirecting to login...");
                setTimeout(() => logout(), 2000);
            } else {
                toast.error("Failed to sync users from Entra ID");
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleEditClick = async (user: any) => {
        setEditingUser(user);
        setRole(user.role || 'user');
        setDepartmentId(user.departmentId || "");
        try {
            setScreens(user.allowedScreens ? JSON.parse(user.allowedScreens) : []);
        } catch (e) { setScreens([]); }

        // Fetch Employee Settings
        try {
            // Note: Use centralized API. Logic for settings fetching remains same.
            const res = await api.get(`/employees/settings/${user.id}`);
            setEmployeeSettings(res.data || {});
        } catch (e) {
            console.error(e);
            setEmployeeSettings({});
        }
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setIsSaving(true);
        try {
            // Update User Info (Role, Screens, Department)
            await api.patch(`/employees/${editingUser.id}`, {
                role,
                allowedScreens: screens,
                departmentId
            });

            // Update Employee Settings
            const { default_time_in, default_lunch_out, default_lunch_in, default_time_out } = employeeSettings;
            await api.patch(`/employees/settings/${editingUser.id}`, {
                default_time_in,
                default_lunch_out,
                default_lunch_in,
                default_time_out
            });

            setEditingUser(null);
            fetchUsers();
            toast.success("User updated successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save changes");
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
        <CanAccess
            resource="employees"
            action="list"
            fallback={<div className="p-8 text-center text-red-500 font-bold">No tienes permiso para administrar usuarios.</div>}
        >
            <div className="p-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>User Management</CardTitle>
                        <CanAccess resource="employees" action="manage">
                            <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm">
                                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Sync from Entra ID'}
                            </Button>
                        </CanAccess>
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
                                            <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
                                                <CanAccess resource="employees" action="update">
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" onClick={() => handleEditClick(user)}>Edit Permissions</Button>
                                                    </DialogTrigger>
                                                </CanAccess>
                                                {editingUser?.id === user.id && (
                                                    <DialogContent className="sm:max-w-[425px]">
                                                        <DialogHeader>
                                                            <DialogTitle>Edit User: {editingUser.name}</DialogTitle>
                                                            <DialogDescription>Change role and screen access.</DialogDescription>
                                                        </DialogHeader>

                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label className="text-right">Role</Label>
                                                                <Select value={role} onValueChange={setRole}>
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="Select role" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="user">User (Employee)</SelectItem>
                                                                        <SelectItem value="hr">Supervisor</SelectItem>
                                                                        <SelectItem value="admin">Admin</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label className="text-right">Department</Label>
                                                                <Select value={departmentId} onValueChange={setDepartmentId}>
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="Select Department" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">_No Department_</SelectItem>
                                                                        {departments.map((d) => (
                                                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <Label>Permissions (Resource:Action)</Label>
                                                                    <Badge variant="outline" className="text-[10px]">Matrix Mode</Badge>
                                                                </div>
                                                                <div className="border rounded-md overflow-hidden">
                                                                    <Table>
                                                                        <TableHeader className="bg-muted/50">
                                                                            <TableRow className="hover:bg-transparent">
                                                                                <TableHead className="w-[150px] py-2 text-xs">Module</TableHead>
                                                                                <TableHead className="text-center py-2 text-xs">Read/List</TableHead>
                                                                                <TableHead className="text-center py-2 text-xs">Write</TableHead>
                                                                                <TableHead className="text-center py-2 text-xs">Del</TableHead>
                                                                                <TableHead className="text-center py-2 text-xs">Full</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {availableScreens.map(sc => {
                                                                                const hasRead = screens.includes(`${sc.id}:read`) || screens.includes(sc.id);
                                                                                const hasCreate = screens.includes(`${sc.id}:create`) || screens.includes(sc.id);
                                                                                const hasUpdate = screens.includes(`${sc.id}:update`) || screens.includes(sc.id);
                                                                                const hasDelete = screens.includes(`${sc.id}:delete`) || screens.includes(sc.id);
                                                                                const hasManage = screens.includes(sc.id) || screens.includes(`${sc.id}:manage`);

                                                                                const toggle = (action: string, checked: boolean) => {
                                                                                    const perm = action === 'manage' ? sc.id : `${sc.id}:${action}`;
                                                                                    setScreens(prev =>
                                                                                        checked
                                                                                            ? [...new Set([...prev, perm])]
                                                                                            : prev.filter(p => p !== perm && p !== sc.id) // Unchecking granular removes global too
                                                                                    );
                                                                                };

                                                                                return (
                                                                                    <TableRow key={sc.id} className="h-10">
                                                                                        <TableCell className="font-medium text-xs py-1">{sc.label}</TableCell>
                                                                                        <TableCell className="text-center py-1">
                                                                                            <Checkbox
                                                                                                checked={hasRead}
                                                                                                onCheckedChange={(c) => toggle('read', !!c)}
                                                                                            />
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-1">
                                                                                            <Checkbox
                                                                                                checked={hasUpdate || hasCreate}
                                                                                                onCheckedChange={(c) => {
                                                                                                    toggle('update', !!c);
                                                                                                    toggle('create', !!c);
                                                                                                }}
                                                                                            />
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-1">
                                                                                            <Checkbox
                                                                                                checked={hasDelete}
                                                                                                onCheckedChange={(c) => toggle('delete', !!c)}
                                                                                            />
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-1">
                                                                                            <Checkbox
                                                                                                checked={hasManage}
                                                                                                onCheckedChange={(c) => toggle('manage', !!c)}
                                                                                            />
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                                                            <Button onClick={handleSave} disabled={isSaving}>
                                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                )}
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </CanAccess>
    );
};
