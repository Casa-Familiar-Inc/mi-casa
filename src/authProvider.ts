import { AuthProvider } from "@refinedev/core";
import pb from "./pocketbase";

export const adminAuthProvider: AuthProvider = {
    login: async ({ email, password }) => {
        try {
            await pb.admins.authWithPassword(email, password);
            return {
                success: true,
                redirectTo: "/",
            };
        } catch (error: any) {
            return {
                success: false,
                error: {
                    name: "LoginError",
                    message: error.message || "Invalid email or password",
                },
            };
        }
    },
    logout: async () => {
        pb.authStore.clear();
        return {
            success: true,
            redirectTo: "/login",
        };
    },
    check: async () => {
        // Updated to use isSuperuser instead of deprecated isAdmin
        if (pb.authStore.isValid && pb.authStore.isSuperuser) {
            return {
                authenticated: true,
            };
        }

        return {
            authenticated: false,
            redirectTo: "/login",
        };
    },
    getPermissions: async () => {
        // Admins usually have full permissions
        return ["admin"];
    },
    getIdentity: async () => {
        // Updated deprecated .model property to .record
        const record = pb.authStore.record;
        return {
            id: record?.id,
            name: (record as any)?.email,
            avatar: (record as any)?.avatar,
        };
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};
