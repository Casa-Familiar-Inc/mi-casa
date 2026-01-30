const API_BASE = `${import.meta.env.VITE_API_URL}/api`;
const API_URL = `${API_BASE}/employees`; // The backend route is /api/employees for user mgmt

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    jobTitle?: string;
}

export const UserService = {
    async getAllUsers(): Promise<User[]> {
        try {
            const response = await fetch(API_URL, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }
};
