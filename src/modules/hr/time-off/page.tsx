import { TimeOffContainer } from "./container";
import { useParams } from "react-router";

export const TimeOffPage = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">
                {id ? 'Viewing Time Off Request' : 'New Time Off Request'}
            </h1>
            <TimeOffContainer requestId={id} />
        </div>
    );
};
