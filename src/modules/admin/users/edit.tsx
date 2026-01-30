
import React, { useEffect, useState } from "react";
import { useGo } from "@refinedev/core";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { OrganizationService } from "../../../services/organizationService";

// Move AVAILABLE_SCREENS to a shared constant or keep here
const AVAILABLE_SCREENS = [
    { id: 'loans', label: 'Loans' },
    { id: 'TimeSheets', label: 'TimeSheets' },
    { id: 'TimeOff', label: 'Time Off' },
    { id: 'Supervisor', label: 'Supervisor Dashboard' },
    { id: 'employees', label: 'Employee Management' },
    { id: 'it-category', label: 'IT Settings' }
];

export const UserEdit = () => {
    const { id } = useParams();
    const go = useGo();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Data Sources
    const [departments, setDepartments] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]); // For Manager Selection

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'user',
        jobTitle: '',
        departmentId: '',
        managerId: '',
        phoneNumber: '',
        officeLocation: '',
        allowedScreens: [] as string[]
    });

    useEffect(() => {
        const init = async () => {
             try {
                // Fetch Depts
                const depts = await OrganizationService.getAllDepartments();
                setDepartments(depts);

                // Fetch All Users (for Manager list & current user data)
                // Ideally we have a getUserById endpoint, but specific fetch is fine too
                // We'll reuse the bulk list for now to get manager names.
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employees`, { credentials: 'include' });
                if (res.ok) {
                    const allUsers = await res.json();
                    setUsers(allUsers);
                    const user = allUsers.find((u: any) => u.id === id);
                    if (user) {
                         setFormData({
                            name: user.name || '',
                            email: user.email || '',
                            role: user.role || 'user',
                            jobTitle: user.jobTitle || '',
                            departmentId: user.departmentId || 'none',
                            managerId: user.managerId || 'none',
                            phoneNumber: user.phoneNumber || '',
                            officeLocation: user.officeLocation || '',
                            allowedScreens: user.allowedScreens ? JSON.parse(user.allowedScreens) : []
                        });
                    }
                }
             } catch (e) {
                 console.error(e);
                 toast.error("Failed to load user data");
             } finally {
                 setIsLoading(false);
             }
        };
        init();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employees/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Failed to save");
            
            toast.success("User updated successfully");
            go({ to: '/admin/users' });
        } catch (e) {
            console.error(e);
            toast.error("Error saving user");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleScreen = (screenId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            allowedScreens: checked 
                ? [...prev.allowedScreens, screenId]
                : prev.allowedScreens.filter(s => s !== screenId)
        }));
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Edit User: {formData.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="hr">Supervisor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={formData.departmentId || 'none'} onValueChange={v => setFormData({...formData, departmentId: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {departments.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Manager</Label>
                             <Select value={formData.managerId || 'none'} onValueChange={v => setFormData({...formData, managerId: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Manager" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {users.filter(u => u.id !== id).map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Office Location</Label>
                             <Input value={formData.officeLocation} onChange={e => setFormData({...formData, officeLocation: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label>Allowed Screens (Permissions)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border rounded p-4">
                            {AVAILABLE_SCREENS.map(sc => (
                                <div key={sc.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={sc.id} 
                                        checked={formData.allowedScreens.includes(sc.id)}
                                        onCheckedChange={(c) => toggleScreen(sc.id, !!c)}
                                    />
                                    <Label htmlFor={sc.id} className="cursor-pointer">{sc.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <Button variant="outline" onClick={() => go({ to: '/admin/users' })}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};
