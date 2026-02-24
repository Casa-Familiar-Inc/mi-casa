import { useEffect } from "react";
import { authClient } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

export const useSessionSync = () => {
    const { setAuthData, clearAuthData } = useAuthStore();
    const { data: session } = authClient.useSession();

    useEffect(() => {
        if (session?.user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user = session.user as any;

            let hasReports = false;
            let reports = user.directReports;

            if (typeof reports === 'string') {
                try {
                    reports = JSON.parse(reports);
                } catch (e) {
                    reports = [];
                }
            }

            if (Array.isArray(reports) && reports.length > 0) {
                hasReports = true;
            }

            const isSup = !!user.isSupervisor || hasReports;
            const role = user.role || 'user';

            // Update Store (Auto-persists)
            setAuthData({
                isSupervisor: isSup,
                directReports: reports,
                userRole: role,
                userId: user.id || null
            });

        } else {
            clearAuthData();
        }
    }, [session, setAuthData, clearAuthData]);
};
