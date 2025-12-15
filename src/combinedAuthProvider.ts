import { AuthProvider } from "@refinedev/core";
import { adminAuthProvider } from "./authProvider";
import { microsoftAuthProvider } from "./authProviderMicrosoft";

/**
 * Combined auth provider that delegates to either the admin provider (PocketBase admins)
 * or the Microsoft OAuth2 provider based on the `provider` param passed to `login`.
 * All other methods try Microsoft first, then fall back to admin.
 */
export const combinedAuthProvider: AuthProvider = {
    login: async (params) => {
        if (params?.provider === "microsoft") {
            return await microsoftAuthProvider.login(params);
        }
        return await adminAuthProvider.login(params);
    },
    logout: async (params) => {
        if (params?.provider === "microsoft") {
            return await microsoftAuthProvider.logout(params);
        }
        return await adminAuthProvider.logout(params);
    },
    check: async (params) => {
        const ms = await microsoftAuthProvider.check(params);
        if (ms.authenticated) return ms;
        return await adminAuthProvider.check(params);
    },
    getIdentity: async (params) => {
        const ms = await microsoftAuthProvider.getIdentity?.(params);
        if (ms) return ms;
        return await adminAuthProvider.getIdentity?.(params);
    },
    getPermissions: async (params) => {
        const ms = await microsoftAuthProvider.getPermissions?.(params);
        if (ms) return ms;
        return await adminAuthProvider.getPermissions?.(params);
    },
    onError: async (error) => {
        await microsoftAuthProvider.onError?.(error);
        await adminAuthProvider.onError?.(error);
        return { error };
    },
};
