
export const sendGraphEmail = async (to: string, subject: string, body: string) => {
    const token = localStorage.getItem('ms_graph_token');
    if (!token) {
        console.error("No Microsoft Graph token found. Cannot send email.");
        return false;
    }

    const emailData = {
        message: {
            subject: subject,
            body: {
                contentType: "HTML",
                content: body
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to
                    }
                }
            ]
        },
        saveToSentItems: "true"
    };

    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (response.ok) {
            console.log("Email sent successfully to", to);
            return true;
        } else {
            const error = await response.json();
            console.error("Failed to send email:", error);
            // If 401, token might be expired.
            if (response.status === 401) {
                console.warn("Token expired. User may need to re-login.");
            }
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
