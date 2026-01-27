
import React from 'react';
import { useNavigation } from "@refinedev/core";
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
    { id: 'loans', label: 'Loans' },
    { id: 'TimeSheets', label: 'TimeSheets' },
    { id: 'TimeOff', label: 'Time Off' },
    { id: 'Supervisor', label: 'Supervisor Dashboard' },
    { id: 'employees', label: 'Employee Management' },
    { id: 'it-category', label: 'IT Settings' }
];

export const UserList: React.FC = () => {
    const [users, setUsers] = React.useState<any[]>([]);
    const [availableScreens, setAvailableScreens] = React.useState<{id: string, label: string}[]>(AVAILABLE_SCREENS);
    const [isLoading, setIsLoading] = React.useState(true);

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
                <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Allowed Screens</TableHead>
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
                                    <TableCell className="text-right">
                                        <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" onClick={() => handleEditClick(user)}>Edit Permissions</Button>
                                            </DialogTrigger>
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

                                                        <div className="space-y-4">
                                                            <Label>Allowed Screens</Label>
                                                            <div className="border rounded p-4 space-y-2">
                                                                {availableScreens.map(sc => (
                                                                    <div key={sc.id} className="flex items-center space-x-2">
                                                                        <Checkbox 
                                                                            id={`screen-${sc.id}`} 
                                                                            checked={screens.includes(sc.id)}
                                                                            onCheckedChange={(c) => toggleScreen(sc.id, !!c)}
                                                                        />
                                                                        <label htmlFor={`screen-${sc.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                            {sc.label}
                                                                        </label>
                                                                    </div>
                                                                ))}
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
    );
};
