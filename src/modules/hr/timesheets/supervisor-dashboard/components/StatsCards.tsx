
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Users, FileText } from "lucide-react";

interface StatsProps {
    pendingTimesheets: number;
    pendingTimeOff: number;
}

export const StatsCards: React.FC<StatsProps> = ({ pendingTimesheets, pendingTimeOff }) => {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Pending Timesheets
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingTimesheets}</div>
                    <p className="text-xs text-muted-foreground">
                        Require your approval
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Pending Time Off
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingTimeOff}</div>
                    <p className="text-xs text-muted-foreground">
                        Waitlisted requests
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
