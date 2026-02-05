import { api } from "../lib/api";

export interface Department {
    id: string;
    name: string;
    code?: string;
    managerId?: string;
    aliases?: string[];
    managerName?: string;
    managerEmail?: string;
}

export const OrganizationService = {
    async getAllDepartments(): Promise<Department[]> {
        try {
            const response = await api.get('/organization/departments');
            return response.data;
        } catch (error) {
            console.error("Error fetching departments:", error);
            return [];
        }
    },

    async createDepartment(data: { name: string; code?: string }): Promise<string> {
        try {
            const response = await api.post('/organization/departments', data);
            return response.data.id;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || "Failed to create department");
        }
    },

    async updateDepartment(id: string, data: Partial<Department>): Promise<void> {
        try {
            await api.patch(`/organization/departments/${id}`, data);
        } catch (error: any) {
            throw new Error(error.response?.data?.message || "Failed to update department");
        }
    },

    async deleteDepartment(id: string): Promise<void> {
        try {
            await api.delete(`/organization/departments/${id}`);
        } catch (error) {
            throw new Error("Failed to delete department");
        }
    }
};
