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
        const user = session?.user as any;
        if (!user) return null;

        return {
            role: user.role,
            isSupervisor: !!user.isSupervisor,
            // Fallback for role-based checks
            roles: [user.role]
        };
    },
    getIdentity: async () => {
        const { data: session } = await authClient.getSession();
        if (!session) return null;
        return {
            id: session.user.id,
            name: session.user.name || session.user.email,
            email: session.user.email,
            avatar: session.user.image,
            departmentId: (session.user as any).departmentId,
        };
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};
