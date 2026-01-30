import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Department } from '@/services/organizationService';
import { User, UserService } from '@/services/userService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface DepartmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    department?: Department;
    onSave: (data: { name: string; code?: string; managerId?: string; aliases?: string[] }) => Promise<void>;
}

export const DepartmentDialog: React.FC<DepartmentDialogProps> = ({ open, onOpenChange, department, onSave }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [managerId, setManagerId] = useState<string>('');
    const [aliases, setAliases] = useState<string[]>([]);
    const [aliasInput, setAliasInput] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setName(department?.name || '');
            setCode(department?.code || '');
            setManagerId(department?.managerId || '');
            setAliases(department?.aliases || []);
            setAliasInput('');
            fetchUsers();
        }
    }, [open, department]);

    const fetchUsers = async () => {
        const data = await UserService.getAllUsers();
        setUsers(data);
    };

    const handleAddAlias = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && aliasInput.trim()) {
            e.preventDefault();
            if (!aliases.includes(aliasInput.trim())) {
                setAliases([...aliases, aliasInput.trim()]);
            }
            setAliasInput('');
        }
    };

    const removeAlias = (alias: string) => {
        setAliases(aliases.filter(a => a !== alias));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({ name, code, managerId, aliases });
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{department ? 'Edit Department' : 'Create Department'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Department Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Engineering" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="code">Code (Optional)</Label>
                        <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. ENG" />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Manager (Default Supervisor)</Label>
                        <Select value={managerId} onValueChange={setManagerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Aliases (Sync Matching)</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {aliases.map(alias => (
                                <Badge key={alias} variant="secondary" className="gap-1">
                                    {alias}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeAlias(alias)} />
                                </Badge>
                            ))}
                        </div>
                        <Input 
                            value={aliasInput} 
                            onChange={e => setAliasInput(e.target.value)} 
                            onKeyDown={handleAddAlias}
                            placeholder="Type alias and press Enter (e.g. 'Ingenieria')" 
                        />
                        <p className="text-[10px] text-muted-foreground">These names will automatically link users from Entra ID to this department.</p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
