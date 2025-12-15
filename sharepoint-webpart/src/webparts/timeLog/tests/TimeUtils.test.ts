import { assert } from 'chai';
import { TimeUtils } from '../utils/TimeUtils';

describe('TimeUtils', () => {
    it('should calculate daily total correctly for standard day', () => {
        const total = TimeUtils.calculateDailyTotal('08:00', '12:00', '13:00', '17:00');
        assert.equal(total, '8.00');
    });

    it('should calculate daily total correctly without lunch', () => {
        const total = TimeUtils.calculateDailyTotal('08:00', '', '', '12:00');
        assert.equal(total, '4.00');
    });

    it('should return 0.00 for invalid or missing times', () => {
        const total = TimeUtils.calculateDailyTotal('', '', '', '');
        assert.equal(total, '0.00');
    });

    it('should handle partial hours correctly', () => {
        const total = TimeUtils.calculateDailyTotal('08:30', '12:30', '13:00', '17:00');
        // 8:30 to 12:30 = 4 hours
        // Lunch 12:30 to 13:00 = 0.5 hours
        // Net = 3.5 hours? Wait.
        // 8:30 to 17:00 = 8.5 hours total span
        // Lunch 12:30 to 13:00 = 0.5 hours
        // Result should be 8.00
        assert.equal(total, '8.00');
    });
});
