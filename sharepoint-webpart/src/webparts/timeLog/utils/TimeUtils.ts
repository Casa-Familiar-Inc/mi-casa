export class TimeUtils {
    public static parseTime(t: string): number {
        if (!t) return 0;
        // Handle "5:00" or "05:00"
        const parts = t.split(':');
        if (parts.length !== 2) return 0;

        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);

        if (isNaN(h) || isNaN(m)) return 0;

        return h + m / 60;
    }

    public static calculateDailyTotal(timeIn: string, lunchOut: string, lunchIn: string, timeOut: string): string {
        let duration = 0;
        if (timeIn && timeOut) {
            const tIn = TimeUtils.parseTime(timeIn);
            const tOut = TimeUtils.parseTime(timeOut);

            // Handle overnight (e.g. 11 PM to 1 AM) - though unlikely for this use case, simple check:
            // If out < in, assume next day? For now, standard day shift.
            if (tOut >= tIn) {
                duration = tOut - tIn;
            }

            if (lunchOut && lunchIn) {
                const lOut = TimeUtils.parseTime(lunchOut);
                const lIn = TimeUtils.parseTime(lunchIn);
                if (lIn >= lOut) {
                    duration -= (lIn - lOut);
                }
            }
        }
        return Math.max(0, duration).toFixed(2);
    }
}
