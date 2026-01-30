const API_BASE = `${import.meta.env.VITE_API_URL}/api`;
const API_URL = `${API_BASE}/organization/departments`;

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
            const response = await fetch(API_URL, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching departments:", error);
            return [];
        }
    },

    async createDepartment(data: { name: string; code?: string }): Promise<string> {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to create department");
        }
        const result = await response.json();
        return result.id;
    },

    async updateDepartment(id: string, data: Partial<Department>): Promise<void> {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to update department");
        }
    },

    async deleteDepartment(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error("Failed to delete department");
        }
    }
};
