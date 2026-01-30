export interface InviteUserPayload {
    email: string;
    role: string;
    departmentId?: string;
    managerId?: string;
}

export interface RegisterUserPayload {
    token: string;
    name: string;
    password: string;
}

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

export const EmployeesService = {
    async inviteUser(data: InviteUserPayload) {
        const response = await fetch(`${API_BASE}/employees/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to invite user");
        }

        return await response.json();
    }
};
