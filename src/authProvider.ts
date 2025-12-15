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
        if (pb.authStore.isValid && pb.authStore.isAdmin) {
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
        const model = pb.authStore.model;
        return {
            id: model?.id,
            name: model?.email,
            avatar: model?.avatar,
        };
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};
