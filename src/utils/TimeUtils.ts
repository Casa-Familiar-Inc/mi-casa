export class TimeUtils {
    public static parseTime(t: string): number {
        if (!t) return 0;
        const parts = t.split(':');

        const h = parseInt(parts[0], 10);
        if (isNaN(h)) return 0;

        if (parts.length < 2) return h; // Handle just hour

        const m = parseInt(parts[1], 10);
        if (isNaN(m)) return h;

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
    public static formatDisplayDateTime(d: string | undefined): string {
        if (!d) return '';
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return d;

            // Format to "MMM dd, yyyy HH:mm"
            return date.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return d;
        }
    }
}
