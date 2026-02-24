import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

interface AuthState {
    isSupervisor: boolean;
    directReports: string[];
    userRole: string | null;
    userId: string | null;

    setAuthData: (data: {
        isSupervisor: boolean;
        directReports: string[];
        userRole: string | null;
        userId: string | null;
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

                setAuthData: (data) => set({
                    isSupervisor: data.isSupervisor,
                    directReports: data.directReports,
                    userRole: data.userRole,
                    userId: data.userId
                }),

                clearAuthData: () => set({
                    isSupervisor: false,
                    directReports: [],
                    userRole: null,
                    userId: null
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
