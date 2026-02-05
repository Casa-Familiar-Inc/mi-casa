import { api } from "../lib/api";

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
            const response = await api.get('/employees');
            return response.data;
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }
};
