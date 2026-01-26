import { AuthProvider } from "@refinedev/core";
import { signIn, signOut, authClient } from "./lib/auth";

export const adminAuthProvider: AuthProvider = {
    login: async ({ email, password }) => {
        try {
            const { error } = await signIn.email({
                email,
                password,
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        name: "LoginError",
                        message: error.message || "Invalid email or password",
                    },
                };
            }

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
        await signOut();
        return {
            success: true,
            redirectTo: "/login",
        };
    },
    check: async () => {
        const { data: session } = await authClient.getSession();
        if (session) {
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
        const { data: session } = await authClient.getSession();
        // Adjust based on your session user properties
        return (session?.user as any)?.role ? [(session?.user as any).role] : [];
    },
    getIdentity: async () => {
        const { data: session } = await authClient.getSession();
        if (!session) return null;
        return {
            id: session.user.id,
            name: session.user.name || session.user.email,
            email: session.user.email,
            avatar: session.user.image,
        };
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};
