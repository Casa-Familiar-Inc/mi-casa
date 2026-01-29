const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

export const HolidayService = {
    async getHolidays() {
        try {
            const response = await fetch(`${API_BASE}/holidays`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching holidays:", error);
            return [];
        }
    },

    async getHolidaysByRange(start: string, end: string) {
        try {
            const response = await fetch(`${API_BASE}/holidays/range?start=${start}&end=${end}`, { credentials: 'include' });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching holidays by range:", error);
            return [];
        }
    },

    async saveHoliday(holiday: any) {
        try {
            const response = await fetch(`${API_BASE}/holidays`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(holiday),
            });
            if (!response.ok) throw new Error("Failed to save holiday");
            return await response.json();
        } catch (error) {
            console.error("Error saving holiday:", error);
            throw error;
        }
    },

    async deleteHoliday(id: string) {
        try {
            const response = await fetch(`${API_BASE}/holidays/${id}`, {
                method: "DELETE",
                credentials: 'include',
            });
            if (!response.ok) throw new Error("Failed to delete holiday");
            return await response.json();
        } catch (error) {
            console.error("Error deleting holiday:", error);
            throw error;
        }
    }
};
