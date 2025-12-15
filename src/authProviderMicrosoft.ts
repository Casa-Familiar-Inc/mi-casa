import { AuthProvider } from "@refinedev/core";
import pb from "./pocketbase";

export const microsoftAuthProvider: AuthProvider = {
    login: async () => {
        try {
            const authData = await pb.collection("users").authWithOAuth2({
                provider: "microsoft",
            });

            if (pb.authStore.isValid) {
                return {
                    success: true,
                    redirectTo: "/",
                };
            }
            return { success: false, error: { name: "LoginError", message: "Login failed" } };
        } catch (error: any) {
            return { success: false, error: { name: "LoginError", message: error.message ?? "Login failed" } };
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
        if (pb.authStore.isValid) {
            return {
                authenticated: true,
            };
        }

        return {
            authenticated: false,
            redirectTo: "/login",
        };
    },
    getPermissions: async () => null,
    getIdentity: async () => {
        if (pb.authStore.model) {
            return {
                id: pb.authStore.model.id,
                name: pb.authStore.model.name,
                email: pb.authStore.model.email,
                avatar: pb.authStore.model.avatar,
            };
        }
        return null;
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};

