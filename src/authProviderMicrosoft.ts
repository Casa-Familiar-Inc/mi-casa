import { AuthProvider } from "@refinedev/core";
import { signIn, signOut, authClient } from "./lib/auth";

export const microsoftAuthProvider: AuthProvider = {
    login: async (params) => {
        try {
            // Check if it's an email/password login
            if (params?.email && params?.password) {
                const { error } = await signIn.email({
                    email: params.email,
                    password: params.password,
                });

                if (error) {
                    return {
                        success: false,
                        error: {
                            name: "LoginError",
                            message: error.message || "Invalid credentials",
                        },
                    };
                }

                return {
                    success: true,
                    redirectTo: "/",
                };
            }

            // Fallback to Microsoft Social Login
            const { error } = await signIn.social({
                provider: "microsoft",
                callbackURL: window.location.origin,
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        name: "LoginError",
                        message: error.message || "Microsoft login failed",
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
                    message: error.message || "Microsoft login failed",
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
        if (session?.user) {
            // BetterAuth users often have these fields synced
            const user = session.user as any;
            return {
                jobTitle: user.jobTitle || '',
                isSupervisor: !!user.isSupervisor
            };
        }
        return null;
    },
    getIdentity: async () => {
        const { data: session } = await authClient.getSession();
        if (session?.user) {
            return {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                avatar: session.user.image,
                departmentId: (session.user as any).departmentId,
            };
        }
        return null;
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};
