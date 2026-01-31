import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

interface AuthState {
    isSupervisor: boolean;
    directReports: string[];
    userRole: string | null;
    userId: string | null;
    allowedScreens: string[];

    setAuthData: (data: {
        isSupervisor: boolean;
        directReports: string[];
        userRole: string | null;
        userId: string | null;
        allowedScreens?: string[];
    }) => void;
    clearAuthData: () => void;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                isSupervisor: false,
                directReports: [],
                userRole: null,
                userId: null,
                allowedScreens: [],

                setAuthData: (data) => set({
                    isSupervisor: data.isSupervisor,
                    directReports: data.directReports,
                    userRole: data.userRole,
                    userId: data.userId,
                    allowedScreens: data.allowedScreens || []
                }),

                clearAuthData: () => set({
                    isSupervisor: false,
                    directReports: [],
                    userRole: null,
                    userId: null,
                    allowedScreens: []
                }),
            }),
            {
                name: 'auth-storage',
                storage: createJSONStorage(() => localStorage),
            }
        ),
        { name: 'Auth Store' }
    )
);
