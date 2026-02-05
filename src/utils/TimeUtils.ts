import { format, parse, differenceInMinutes, isValid, parseISO } from 'date-fns';

export class TimeUtils {
    /**
     * Parses "HH:MM" string into decimal hours (e.g. "08:30" -> 8.5)
     */
    public static parseTime(t: string): number {
        if (!t) return 0;
        try {
            const [hours, minutes] = t.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return 0;
            return hours + (minutes / 60);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Calculates daily total hours between In/Out with Lunch deduction
     * Inputs are "HH:MM" strings
     */
    public static calculateDailyTotal(timeIn: string, lunchOut: string, lunchIn: string, timeOut: string): string {
        try {
            if (!timeIn || !timeOut) return "0.00";

            const referenceDate = new Date(); // Use today as base for time parsing
            const tIn = parse(timeIn, 'HH:mm', referenceDate);
            const tOut = parse(timeOut, 'HH:mm', referenceDate);

            if (!isValid(tIn) || !isValid(tOut)) return "0.00";

            let minutes = differenceInMinutes(tOut, tIn);

            if (lunchOut && lunchIn) {
                const lOut = parse(lunchOut, 'HH:mm', referenceDate);
                const lIn = parse(lunchIn, 'HH:mm', referenceDate);

                if (isValid(lOut) && isValid(lIn)) {
                    const lunchMinutes = differenceInMinutes(lIn, lOut);
                    minutes -= lunchMinutes;
                }
            }

            const total = Math.max(0, minutes / 60);
            return total.toFixed(2);
        } catch (e) {
            console.error("Error calculating daily total", e);
            return "0.00";
        }
    }

    public static formatDisplayDateTime(d: string | undefined): string {
        if (!d) return '';
        try {
            const date = new Date(d);
            if (!isValid(date)) return d;
            return format(date, 'MMM dd, yyyy hh:mm a');
        } catch (e) {
            return d || '';
        }
    }

    public static formatDisplayDate(d: string | undefined): string {
        if (!d) return '';
        try {
            // Check if YYYY-MM-DD pattern to avoid timezone shifts with new Date(string)
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                const [y, m, day] = d.split('-').map(Number);
                // Create with local time components to preserve the date
                const date = new Date(y, m - 1, day);
                return format(date, 'MM/dd/yyyy');
            }

            const date = new Date(d);
            if (!isValid(date)) return d;
            return format(date, 'MM/dd/yyyy');
        } catch (e) {
            return d || '';
        }
    }
}
