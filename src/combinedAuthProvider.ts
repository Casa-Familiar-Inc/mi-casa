import { AuthProvider } from "@refinedev/core";
// import { adminAuthProvider } from "./authProvider";
import { microsoftAuthProvider } from "./authProviderMicrosoft";

/**
 * Combined auth provider that delegates to either the admin provider (PocketBase admins)
 * or the Microsoft OAuth2 provider based on the `provider` param passed to `login`.
 * All other methods try Microsoft first, then fall back to admin.
 */
export const combinedAuthProvider: AuthProvider = {
    login: async (params) => {
        return await microsoftAuthProvider.login(params);
    },
    logout: async (params) => {
        return await microsoftAuthProvider.logout(params);
    },
    check: async (params) => {
        return await microsoftAuthProvider.check(params);
    },
    getIdentity: async (params) => {
        return await microsoftAuthProvider.getIdentity?.(params);
    },
    getPermissions: async (params) => {
        return await microsoftAuthProvider.getPermissions?.(params);
    },
    onError: async (error) => {
        return await microsoftAuthProvider.onError?.(error);
    },
};
