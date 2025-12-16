import { TimeSheetContainer } from "../../components/timesheets/TimeSheetContainer";

import { useParams } from "react-router";

export const TimeSheetPage = () => {
    const { email } = useParams<{ email: string }>();
    
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">{email ? `Reviewing: ${email}` : 'My Time Sheet'}</h1>
            <TimeSheetContainer userEmail={email} />
        </div>
    );
};
