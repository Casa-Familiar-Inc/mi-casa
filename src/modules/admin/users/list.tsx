
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
import { UserHierarchy } from './HierarchyView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// No more AVAILABLE_SCREENS needed 

export const UserList: React.FC = () => {
    const { mutate: logout } = useLogout();
    const [users, setUsers] = React.useState<any[]>([]);
    const [departments, setDepartments] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/employees');
            setUsers(Array.isArray(res.data) ? res.data : []);

            // Fetch Departments
            const resDepts = await api.get('/organization/departments');
            setDepartments(resDepts.data);

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
    const [managerId, setManagerId] = React.useState<string>("none"); // Decoupled Manager
    const [isSupervisor, setIsSupervisor] = React.useState(false);
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
        setManagerId(user.managerId || "none"); // Initialize to current manager or None. User can select "Default" to reset.
        setIsSupervisor(!!user.isSupervisor);

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
            await api.patch(`/employees/${editingUser.id}`, {
                role,
                isSupervisor,
                departmentId,
                managerId // Send the decoupled manager ID
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

    const roleLabels: Record<string, string> = {
        admin: 'Admin',
        user: 'User'
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
                                    <TableHead>Department</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Office</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {user.name}
                                                {(user.id === user.departmentManagerId || user.isSupervisor) && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 text-blue-700 bg-blue-50">
                                                        Manager
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                                {roleLabels[user.role] || user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{user.departmentName || '-'}</span>
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
                                                                        <SelectItem value="user">User</SelectItem>
                                                                        <SelectItem value="admin">Admin</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid grid-cols-4 items-start gap-4">
                                                                <Label className="text-right mt-2">Department</Label>
                                                                <div className="col-span-3 space-y-1">
                                                                    <Select value={departmentId} onValueChange={(val) => {
                                                                        setDepartmentId(val);
                                                                        setManagerId("default");
                                                                    }}>
                                                                        <SelectTrigger>
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
                                                            </div>

                                                            <div className="grid grid-cols-4 items-start gap-4">
                                                                <Label className="text-right mt-2">Manager</Label>
                                                                <div className="col-span-3 space-y-1">
                                                                    <Select value={managerId} onValueChange={setManagerId}>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select Manager (Optional)" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">_Default (Department Head)_</SelectItem>
                                                                            {users
                                                                                .filter(u => u.id !== editingUser?.id) // Prevent self-reporting
                                                                                .map((u) => (
                                                                                    <SelectItem key={u.id} value={u.id}>{u.name} {u.departmentName ? `(${u.departmentName})` : ''}</SelectItem>
                                                                                ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <p className="text-[10px] text-muted-foreground italic">
                                                                        * Si se selecciona "Default", se usará el jefe del departamento seleccionado.
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-4 items-start gap-4">
                                                                <Label className="text-right mt-2">Supervisor</Label>
                                                                <div className="col-span-3 space-y-1 flex items-center h-9">
                                                                    <Checkbox
                                                                        id="isSupervisorToggle"
                                                                        checked={isSupervisor}
                                                                        onCheckedChange={(c) => setIsSupervisor(!!c)}
                                                                    />
                                                                    <label htmlFor="isSupervisorToggle" className="ml-2 text-sm text-foreground">
                                                                        Enable Supervisor Access
                                                                    </label>
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
