import { AuthProvider } from "@refinedev/core";
import pb from "./pocketbase";

export const microsoftAuthProvider: AuthProvider = {
    login: async () => {
        try {
            // Updated per documentation for v0.10+
            const authData = await pb.collection("users").authWithOAuth2({
                provider: "microsoft",
                scopes: ["User.Read.All", "Mail.Send", "offline_access"]
            });

            // --- MICROSOFT GRAPH INTEGRATION ---
            // Use the access token from the auth response to query Microsoft Graph
            const accessToken = authData.meta?.accessToken;
            const refreshToken = authData.meta?.refreshToken;

            if (accessToken) {
                // PERSIST TOKENS
                localStorage.setItem('ms_graph_token', accessToken);
                if (refreshToken) {
                    localStorage.setItem('ms_graph_refresh_token', refreshToken);
                } else {
                    console.warn("No Refresh Token received. 'offline_access' scope might be missing or consent not granted.");
                }
                try {
                    // Strategy: A user is a supervisor if they have direct reports.
                    // Fetch direct reports from Graph
                    const reportsResponse = await fetch('https://graph.microsoft.com/v1.0/me/directReports', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    // Also fetch Profile for Job Title
                    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    // Fetch Manager details
                    const managerResponse = await fetch('https://graph.microsoft.com/v1.0/me/manager', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    let graphJobTitle = '';
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        graphJobTitle = profileData.jobTitle || '';
                    }

                    let managerEmail = '';
                    if (managerResponse.ok) {
                        const managerData = await managerResponse.json();
                        managerEmail = managerData.mail || managerData.userPrincipalName || '';
                        console.log("Manager from Graph:", managerEmail);
                    }

                    if (reportsResponse.ok) {
                        const data = await reportsResponse.json();
                        console.log("Graph Direct Reports:", data);

                        // Check if the user has any direct reports
                        // Microsoft Graph returns keys like '@odata.context' and 'value' (array)
                        const directReports = data.value || [];
                        const isSupervisor = directReports.length > 0;

                        // Extract emails of direct reports
                        const reportEmails = directReports
                            .map((r: any) => r.mail || r.userPrincipalName)
                            .filter((e: string) => !!e);
                        // We can also fetch the profile if needed for jobTitle, but directReports is a stronger signal for "Supervisor".
                        // Let's assume job title isn't the primary key.

                        // --- NEW: Secure Sync to PocketBase ---
                        // Update the user's PocketBase record with this data for server-side logic
                        const currentUserId = pb.authStore.record?.id;
                        console.log("Syncing to PB User:", currentUserId);
                        console.log("Job Title from Graph:", graphJobTitle);
                        console.log("Direct Reports to save:", reportEmails);

                        if (currentUserId) {
                            try {
                                const updateData = {
                                    job_title: graphJobTitle || '',
                                    direct_reports: reportEmails,
                                    is_supervisor: isSupervisor, // Now syncing boolean logic
                                    manager_email: managerEmail
                                };
                                console.log("Updating PB with:", updateData);

                                // Update database
                                const updatedRecord = await pb.collection('users').update(currentUserId, updateData);
                                console.log("Synced detailed user info to PocketBase successfully.");

                                // CRITICAL: Update the local auth store immediately so the UI sees the new fields!
                                pb.authStore.save(pb.authStore.token, updatedRecord);
                                console.log("Updated local authStore record:", pb.authStore.record);

                            } catch (updateErr: any) {
                                console.error("Failed to sync user info to PB:", updateErr);
                                // Check for common permission error
                                if (updateErr.status === 403) {
                                    console.error("PERMISSION DENIED: The 'users' collection API Rule likely prevents the user from updating their own record. Please check 'updateRule' in PocketBase Admin UI.");
                                }
                            }
                        }
                        // --------------------------------------
                    } else {
                        console.warn("Graph API returned:", reportsResponse.status, reportsResponse.statusText);
                        // If 403 Forbidden, it means the app lacks 'User.Read.All' or similar permission to read reports.
                    }
                } catch (err) {
                    console.error("Failed to query Microsoft Graph:", err);
                }
            }
            // -----------------------------------

            if (pb.authStore.isValid) {
                return {
                    success: true,
                    redirectTo: "/",
                };
            }
            return { success: false, error: { name: "LoginError", message: "Login failed" } };
        } catch (error: any) {
            // It's possible the user cancelled or pop-up failed.
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
    getPermissions: async () => {
        // Return job title or role from the user record
        if (pb.authStore.record) {
            // Helpful logging for debugging SSO fields
            console.log("Auth Record:", pb.authStore.record);

            // 1. Try PocketBase record fields
            const record = pb.authStore.record as any;
            const jobTitle = record.job_title || '';
            const directReports = record.direct_reports || [];

            // Supervisor logic: Based on 'is_supervisor' flag as requested
            const isSupervisor = !!record.is_supervisor;

            return {
                jobTitle,
                isSupervisor
            };
        }
        return null;
    },
    getIdentity: async () => {
        if (pb.authStore.record) {
            return {
                id: pb.authStore.record.id,
                name: pb.authStore.record.name,
                email: pb.authStore.record.email,
                avatar: pb.authStore.record.avatar,
            };
        }
        return null;
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
};
