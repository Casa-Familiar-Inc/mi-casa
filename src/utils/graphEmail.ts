
// TODO: You MUST replace this with your Azure Application (Client) ID for token refresh to work.
// You can copy this from your PocketBase Admin UI -> Settings -> Auth Providers -> Microsoft -> Client ID.
// Read from Environment Variable
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || '';

const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('ms_graph_refresh_token');

    if (!refreshToken || !CLIENT_ID) {
        console.warn("Cannot refresh token: Missing Refresh Token or VITE_AZURE_CLIENT_ID not set in .env.local");
        return false;
    }

    try {
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: 'User.Read.All Mail.Send offline_access'
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('ms_graph_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('ms_graph_refresh_token', data.refresh_token);
                }
                console.log("Graph Token Refreshed Successfully");
                return true;
            }
        } else {
            const err = await response.json();
            console.error("Failed to refresh token:", err);
        }
    } catch (e) {
        console.error("Error refreshing token:", e);
    }
    return false;
};

export const sendGraphEmail = async (to: string, subject: string, body: string) => {
    let token = localStorage.getItem('ms_graph_token');

    // Helper to perform the fetch
    const trySend = async (t: string) => {
        return fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${t}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    subject: subject,
                    body: { contentType: "HTML", content: body },
                    toRecipients: [{ emailAddress: { address: to } }]
                },
                saveToSentItems: "true"
            })
        });
    };

    if (!token) {
        // Try refreshing immediately if no token but have refresh token?
        if (await refreshAccessToken()) {
            token = localStorage.getItem('ms_graph_token');
        } else {
            console.error("No Microsoft Graph token found. Cannot send email.");
            return false;
        }
    }

    try {
        let response = await trySend(token!);

        if (response.status === 401) {
            console.warn("Token expired. Attempting refresh...");
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                token = localStorage.getItem('ms_graph_token');
                response = await trySend(token!);
            } else {
                return false;
            }
        }

        if (response.ok) {
            console.log("Email sent successfully to", to);
            return true;
        } else {
            const error = await response.json();
            console.error("Failed to send email:", error);
            return false;
        }
    } catch (e) {
        console.error("Error sending email:", e);
        return false;
    }
};

export const getManagerProfile = async () => {
    const token = localStorage.getItem('ms_graph_token');
    if (!token) return null;

    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/manager', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            return {
                name: data.displayName,
                email: data.mail || data.userPrincipalName
            };
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch manager:", e);
        return null;
    }
};
