
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Briefcase, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface HierarchyData {
    user: any;
    reportsTo: {
        id: string;
        name: string;
        email: string;
        image?: string;
        jobTitle?: string;
        departmentName?: string;
    } | null;
    directReports: Array<{
        id: string;
        name: string;
        email: string;
        image?: string;
        jobTitle?: string;
        departmentName?: string;
    }>;
}

interface UserHierarchyProps {
    userId: string;
}

export const UserHierarchy: React.FC<UserHierarchyProps> = ({ userId }) => {
    const [data, setData] = useState<HierarchyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        fetchHierarchy();
    }, [userId]);

    const fetchHierarchy = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/employees/${userId}/hierarchy`);
            setData(res.data);
        } catch (e) {
            console.error("Failed to load hierarchy", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="space-y-4 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>;
    }

    if (!data) return <div className="p-4 text-muted-foreground">No hierarchy data found.</div>;

    const UserCard = ({ user, role }: { user: any, role: string }) => (
        <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
            <Avatar className="h-10 w-10">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground truncate">{user.jobTitle || user.email}</p>
                    {user.departmentName && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{user.departmentName}</Badge>
                    )}
                </div>
            </div>
            {role === 'manager' && <ArrowUp className="h-4 w-4 text-muted-foreground" />}
            {role === 'report' && <ArrowDown className="h-4 w-4 text-muted-foreground" />}
        </div>
    );

    return (
        <div className="space-y-6 pt-2">

            {/* Reports To Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" /> Reports To
                </h3>
                {data.reportsTo ? (
                    <UserCard user={data.reportsTo} role="manager" />
                ) : (
                    <div className="flex items-center gap-2 p-3 border border-dashed rounded-lg bg-slate-50 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">No manager assigned (Top Level or Unassigned)</span>
                    </div>
                )}
            </div>

            {/* Direct Reports Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" /> Direct Reports ({data.directReports.length})
                </h3>

                {data.directReports.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {data.directReports.map(report => (
                            <UserCard key={report.id} user={report} role="report" />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center border border-dashed rounded-lg bg-slate-50">
                        <p className="text-sm text-muted-foreground">This user has no direct reports.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
