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

            // Robust screens extraction (handling both snake_case and camelCase)
            const rawScreens = user.allowedScreens || user.allowed_screens;
            let screens: string[] = [];

            if (rawScreens) {
                if (Array.isArray(rawScreens)) {
                    screens = rawScreens;
                } else if (typeof rawScreens === 'string') {
                    try {
                        screens = JSON.parse(rawScreens);
                    } catch (e) {
                        console.error("[useSessionSync] Failed to parse screens string:", e);
                        screens = [];
                    }
                }
            }

            // Update Store (Auto-persists)
            setAuthData({
                isSupervisor: isSup,
                directReports: reports,
                userRole: role,
                userId: user.id || null,
                allowedScreens: screens
            });

        } else {
            clearAuthData();
        }
    }, [session, setAuthData, clearAuthData]);
};
