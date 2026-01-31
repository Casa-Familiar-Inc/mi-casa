import { TimeSheetContainer } from "./container";

import { useParams } from "react-router";
import { CanAccess } from "@refinedev/core";

export const TimeSheetPage = () => {
    const { email, id } = useParams<{ email: string, id: string }>();
    
    return (
        <CanAccess 
            resource="TimeSheets" 
            action={id ? "show" : "list"}
            fallback={<div className="p-8 text-center text-red-500 font-bold">No tienes permiso para acceder a esta pantalla.</div>}
        >
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">
                    {id ? 'Viewing Timesheet' : (email ? `Reviewing: ${email}` : 'My Time Sheet')}
                </h1>
                <TimeSheetContainer userEmail={email} timesheetId={id} />
            </div>
        </CanAccess>
    );
};
