// Unit tests for timezone utility functions

import { describe, it, expect } from 'vitest';
import {
  getLocalDateKey,
  getLocalDateKeyFromTimestamp,
  getLocalDateKeyFromISOString
} from '../../src/logic/timezone.js';

describe('Timezone Utility Functions', () => {
  describe('getLocalDateKey', () => {
    it('should convert UTC date to local date in Mountain Time', () => {
      // UTC: 2025-09-23 06:30 -> MDT: 2025-09-23 00:30 -> Date: 2025-09-23
      const utcDate = new Date('2025-09-23T06:30:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/Denver');
      expect(result).toBe('2025-09-23');
    });

    it('should convert UTC date to local date in Eastern Time', () => {
      // UTC: 2025-09-23 23:30 -> EDT: 2025-09-23 19:30 -> Date: 2025-09-23
      const utcDate = new Date('2025-09-23T23:30:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/New_York');
      expect(result).toBe('2025-09-23');
    });

    it('should handle date boundary crossing (UTC to local)', () => {
      // UTC: 2025-09-24 04:30 -> EDT: 2025-09-24 00:30 -> Date: 2025-09-24
      const utcDate = new Date('2025-09-24T04:30:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/New_York');
      expect(result).toBe('2025-09-24');
    });

    it('should handle date boundary crossing (local to previous day)', () => {
      // UTC: 2025-09-24 02:30 -> PDT: 2025-09-23 19:30 -> Date: 2025-09-23
      const utcDate = new Date('2025-09-24T02:30:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/Los_Angeles');
      expect(result).toBe('2025-09-23');
    });

    it('should handle Pacific timezone', () => {
      // UTC: 2025-12-15 08:00 -> PST: 2025-12-15 00:00 -> Date: 2025-12-15
      const utcDate = new Date('2025-12-15T08:00:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/Los_Angeles');
      expect(result).toBe('2025-12-15');
    });

    it('should handle Central timezone', () => {
      // UTC: 2025-06-15 05:00 -> CDT: 2025-06-15 00:00 -> Date: 2025-06-15
      const utcDate = new Date('2025-06-15T05:00:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/Chicago');
      expect(result).toBe('2025-06-15');
    });

    it('should handle invalid timezone gracefully', () => {
      const utcDate = new Date('2025-09-23T12:00:00.000Z');
      const result = getLocalDateKey(utcDate, 'Invalid/Timezone');
      // Should fallback to UTC date
      expect(result).toBe('2025-09-23');
    });

    it('should handle daylight saving time transitions', () => {
      // Spring forward: UTC: 2025-03-09 08:00 -> MDT: 2025-03-09 02:00 -> Date: 2025-03-09
      const springDate = new Date('2025-03-09T08:00:00.000Z');
      const springResult = getLocalDateKey(springDate, 'America/Denver');
      expect(springResult).toBe('2025-03-09');

      // Fall back: UTC: 2025-11-02 07:00 -> MST: 2025-11-02 01:00 -> Date: 2025-11-02
      const fallDate = new Date('2025-11-02T07:00:00.000Z');
      const fallResult = getLocalDateKey(fallDate, 'America/Denver');
      expect(fallResult).toBe('2025-11-02');
    });

    it('should format single-digit months and days correctly', () => {
      // UTC: 2025-01-05 12:00 -> MST: 2025-01-05 05:00 -> Date: 2025-01-05
      const utcDate = new Date('2025-01-05T12:00:00.000Z');
      const result = getLocalDateKey(utcDate, 'America/Denver');
      expect(result).toBe('2025-01-05');
    });
  });

  describe('getLocalDateKeyFromTimestamp', () => {
    it('should convert UTC timestamp to local date', () => {
      // Timestamp for 2025-09-23T06:30:00.000Z
      const timestamp = new Date('2025-09-23T06:30:00.000Z').getTime();
      const result = getLocalDateKeyFromTimestamp(timestamp, 'America/Denver');
      expect(result).toBe('2025-09-23');
    });

    it('should handle timestamp at midnight UTC', () => {
      // Timestamp for 2025-09-23T00:00:00.000Z
      const timestamp = new Date('2025-09-23T00:00:00.000Z').getTime();
      const result = getLocalDateKeyFromTimestamp(timestamp, 'America/New_York');
      expect(result).toBe('2025-09-22'); // Previous day in EDT
    });

    it('should handle large timestamps', () => {
      // Timestamp for 2030-12-31T23:59:59.999Z
      const timestamp = new Date('2030-12-31T23:59:59.999Z').getTime();
      const result = getLocalDateKeyFromTimestamp(timestamp, 'America/Los_Angeles');
      expect(result).toBe('2030-12-31'); // Same day in PST
    });
  });

  describe('getLocalDateKeyFromISOString', () => {
    it('should convert ISO string to local date', () => {
      const isoString = '2025-09-23T06:30:00.000Z';
      const result = getLocalDateKeyFromISOString(isoString, 'America/Denver');
      expect(result).toBe('2025-09-23');
    });

    it('should handle ISO string without milliseconds', () => {
      const isoString = '2025-09-23T06:30:00Z';
      const result = getLocalDateKeyFromISOString(isoString, 'America/Denver');
      expect(result).toBe('2025-09-23');
    });

    it('should handle ISO string with timezone offset', () => {
      const isoString = '2025-09-23T00:30:00-06:00'; // MDT time
      const result = getLocalDateKeyFromISOString(isoString, 'America/Denver');
      expect(result).toBe('2025-09-23');
    });

    it('should handle invalid ISO string gracefully', () => {
      const invalidIsoString = 'invalid-date-string';
      const result = getLocalDateKeyFromISOString(invalidIsoString, 'America/Denver');
      // Should return 'Invalid Date' or handle gracefully
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle leap year dates', () => {
      // February 29, 2024 (leap year)
      const leapDate = new Date('2024-02-29T12:00:00.000Z');
      const result = getLocalDateKey(leapDate, 'America/Denver');
      expect(result).toBe('2024-02-29');
    });

    it('should handle year boundaries', () => {
      // New Year's Eve UTC -> New Year's Day local
      const newYearUTC = new Date('2025-01-01T06:00:00.000Z');
      const result = getLocalDateKey(newYearUTC, 'America/Denver');
      expect(result).toBe('2024-12-31'); // Previous day in MST
    });

    it('should handle different timezone formats', () => {
      const utcDate = new Date('2025-09-23T12:00:00.000Z');

      // Test various timezone formats
      const denverResult = getLocalDateKey(utcDate, 'America/Denver');
      const chicagoResult = getLocalDateKey(utcDate, 'America/Chicago');
      const nyResult = getLocalDateKey(utcDate, 'America/New_York');

      expect(denverResult).toBe('2025-09-23');
      expect(chicagoResult).toBe('2025-09-23');
      expect(nyResult).toBe('2025-09-23');
    });

    it('should be consistent across all three functions', () => {
      const testDate = new Date('2025-09-23T06:30:00.000Z');
      const timezone = 'America/Denver';

      const dateResult = getLocalDateKey(testDate, timezone);
      const timestampResult = getLocalDateKeyFromTimestamp(testDate.getTime(), timezone);
      const isoResult = getLocalDateKeyFromISOString(testDate.toISOString(), timezone);

      expect(dateResult).toBe(timestampResult);
      expect(timestampResult).toBe(isoResult);
      expect(dateResult).toBe('2025-09-23');
    });
  });

  describe('Real-world Webcam Scenarios', () => {
    it('should handle typical webcam scheduling scenarios', () => {
      // Scenario: Scheduling a sunrise animation for a webcam in Rocky Mountain National Park
      const sunriseTime = new Date('2025-09-23T12:30:00.000Z'); // 6:30 AM MDT
      const result = getLocalDateKey(sunriseTime, 'America/Denver');
      expect(result).toBe('2025-09-23');
    });

    it('should handle sunset animation scheduling', () => {
      // Scenario: Scheduling a sunset animation for a webcam in Yellowstone
      const sunsetTime = new Date('2025-09-23T01:45:00.000Z'); // 7:45 PM MDT (next day UTC)
      const result = getLocalDateKey(sunsetTime, 'America/Denver');
      expect(result).toBe('2025-09-22'); // Previous day in local time
    });

    it('should handle hourly animation scheduling across timezones', () => {
      const hourlyTime = new Date('2025-09-23T18:00:00.000Z');

      // Different national parks in different timezones
      const denverResult = getLocalDateKey(hourlyTime, 'America/Denver'); // MDT
      const laResult = getLocalDateKey(hourlyTime, 'America/Los_Angeles'); // PDT
      const nyResult = getLocalDateKey(hourlyTime, 'America/New_York'); // EDT

      expect(denverResult).toBe('2025-09-23'); // 12:00 PM MDT
      expect(laResult).toBe('2025-09-23'); // 11:00 AM PDT
      expect(nyResult).toBe('2025-09-23'); // 2:00 PM EDT
    });
  });
});
