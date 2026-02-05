import { api } from "../lib/api";

export const HolidayService = {
    async getHolidays() {
        try {
            const response = await api.get('/holidays');
            return response.data;
        } catch (error) {
            console.error("Error fetching holidays:", error);
            return [];
        }
    },

    async getHolidaysByRange(start: string, end: string) {
        try {
            const response = await api.get('/holidays/range', {
                params: { start, end }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching holidays by range:", error);
            return [];
        }
    },

    async saveHoliday(holiday: any) {
        try {
            const response = await api.post('/holidays', holiday);
            return response.data;
        } catch (error) {
            console.error("Error saving holiday:", error);
            throw error;
        }
    },

    async deleteHoliday(id: string) {
        try {
            const response = await api.delete(`/holidays/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting holiday:", error);
            throw error;
        }
    }
};
