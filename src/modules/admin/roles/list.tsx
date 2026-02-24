import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { CanAccess } from "@refinedev/core";

const SUBJECTS = [
    "all", "User", "TimeSheets", "TimeOff", "Expenses", "employees",
    "Supervisor", "TimeOffApprovals", "it-category", "CompanyCalendar",
    "holidays", "organization", "departments", "Accounting", "dashboard"
];

const ACTIONS = ["manage", "create", "read", "update", "delete", "list", "show", "edit"];

export const RolesList = () => {
    const [roles, setRoles] = useState<any[]>([]);
    const [activeRoleId, setActiveRoleId] = useState<string>("");
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchRoles = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/roles");
            setRoles(res.data);
            if (res.data.length > 0 && !activeRoleId) {
                setActiveRoleId(res.data[0].id);
                setPermissions(res.data[0].permissions || []);
            } else if (activeRoleId) {
                const updatedRole = res.data.find((r: any) => r.id === activeRoleId);
                if (updatedRole) setPermissions(updatedRole.permissions || []);
            }
        } catch (e: any) {
            toast.error("Failed to load roles: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleTabChange = (val: string) => {
        setActiveRoleId(val);
        const role = roles.find(r => r.id === val);
        if (role) {
            setPermissions([...(role.permissions || [])]);
        }
    };

    const handleAddRule = () => {
        setPermissions([
            ...permissions,
            { subject: "all", action: "read", inverted: false, conditions: null }
        ]);
    };

    const handleUpdateRule = (index: number, field: string, value: any) => {
        const updated = [...permissions];

        if (field === 'conditions') {
            try {
                updated[index][field] = value ? JSON.parse(value) : null;
            } catch (e) {
                // Invalid JSON, maybe just store string temporarily and validate on save, 
                // but we will just merge it for now.
                updated[index].__rawConditions = value;
            }
        } else {
            updated[index][field] = value;
        }

        setPermissions(updated);
    };

    const handleRemoveRule = (index: number) => {
        const updated = [...permissions];
        updated.splice(index, 1);
        setPermissions(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Validate conditions JSON before saving
            const payload = permissions.map(p => {
                let condObj = p.conditions;
                if (p.__rawConditions !== undefined) {
                    condObj = p.__rawConditions.trim() === "" ? null : JSON.parse(p.__rawConditions);
                }
                return {
                    action: p.action,
                    subject: p.subject,
                    inverted: p.inverted,
                    conditions: condObj
                };
            });

            await api.put(`/roles/${activeRoleId}/permissions`, { permissions: payload });
            toast.success("Role permissions updated successfully");
            fetchRoles(); // Refresh
        } catch (e: any) {
            toast.error("Failed to save changes. Invalid JSON in conditions?");
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && roles.length === 0) return <div className="p-6">Loading Config...</div>;

    const activeRoleData = roles.find(r => r.id === activeRoleId);

    return (
        <CanAccess
            resource="roles"
            action="manage"
            fallback={<div className="p-8 text-center text-red-500 font-bold">You don't have permission to manage roles.</div>}
        >
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Configure dynamic CASL permission matrices. These reflect exactly what subjects and actions a user can perform.
                    </p>
                </div>

                <Card className="border shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Permissions Configurator</CardTitle>
                                <CardDescription>Select a role to configure its access rules</CardDescription>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Role Matrix"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {roles.length > 0 && (
                            <Tabs value={activeRoleId} onValueChange={handleTabChange} className="w-full">
                                <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start mb-6">
                                    {roles.map(r => (
                                        <TabsTrigger
                                            key={r.id}
                                            value={r.id}
                                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-6 py-2"
                                        >
                                            {r.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value={activeRoleId} className="space-y-4 outline-none">
                                    <div className="rounded-md border text-sm">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="w-[200px] uppercase text-xs tracking-wider">Subject</TableHead>
                                                    <TableHead className="w-[150px] uppercase text-xs tracking-wider">Action</TableHead>
                                                    <TableHead className="w-[120px] uppercase text-xs tracking-wider text-center">Allow Access</TableHead>
                                                    <TableHead className="uppercase text-xs tracking-wider">Conditions (JSON)</TableHead>
                                                    <TableHead className="w-[80px] text-right"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {permissions.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                            No rules configured. This role currently has NO ACCESS to anything.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {permissions.map((rule, idx) => (
                                                    <TableRow key={idx} className="group">
                                                        <TableCell>
                                                            <Select value={rule.subject} onValueChange={(v) => handleUpdateRule(idx, "subject", v)}>
                                                                <SelectTrigger className="border-0 shadow-none font-medium text-blue-600 focus:ring-0 px-0 h-auto">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select value={rule.action} onValueChange={(v) => handleUpdateRule(idx, "action", v)}>
                                                                <SelectTrigger className="border-0 shadow-none text-slate-600 focus:ring-0 px-0 h-auto">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Switch
                                                                checked={!rule.inverted}
                                                                onCheckedChange={(c) => handleUpdateRule(idx, "inverted", !c)}
                                                                className="data-[state=checked]:bg-emerald-500"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={rule.__rawConditions !== undefined ? rule.__rawConditions : (rule.conditions ? JSON.stringify(rule.conditions) : '')}
                                                                onChange={(e) => handleUpdateRule(idx, "conditions", e.target.value)}
                                                                placeholder='e.g. {"user_id": "${user.id}"}'
                                                                className="border-transparent hover:border-input focus:border-input bg-slate-50/50 font-mono text-xs shadow-none transition-colors"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => handleRemoveRule(idx)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <Button variant="outline" size="sm" onClick={handleAddRule} className="mt-4 gap-2 border-dashed">
                                        <Plus className="h-4 w-4" /> Add Permission Rule
                                    </Button>

                                    {activeRoleData?.name === "Admin" && permissions.length === 0 && (
                                        <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm mt-4 border border-blue-200">
                                            <strong>Tip:</strong> For an Admin role, simply add <code>Subject: all</code> and <code>Action: manage</code> with <code>Allow Access</code> to grant global permissions.
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
            </div>
        </CanAccess>
    );
};
