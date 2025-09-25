/**
 * Timestamp utility functions for working with Unix timestamps (milliseconds)
 * All timestamps in this application are Unix timestamps in milliseconds
 */

/**
 * Get current Unix timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Convert a Date object to Unix timestamp in milliseconds
 */
export function fromDate(date: Date): number {
  return date.getTime();
}

/**
 * Convert Unix timestamp to Date object (for display purposes only)
 */
export function toDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Add minutes to a Unix timestamp
 */
export function addMinutes(timestamp: number, minutes: number): number {
  return timestamp + (minutes * 60 * 1000);
}

/**
 * Add hours to a Unix timestamp
 */
export function addHours(timestamp: number, hours: number): number {
  return timestamp + (hours * 60 * 60 * 1000);
}

/**
 * Add days to a Unix timestamp
 */
export function addDays(timestamp: number, days: number): number {
  return timestamp + (days * 24 * 60 * 60 * 1000);
}

/**
 * Get the difference between two timestamps in minutes
 */
export function diffInMinutes(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / (1000 * 60);
}

/**
 * Get the difference between two timestamps in hours
 */
export function diffInHours(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / (1000 * 60 * 60);
}

/**
 * Check if a timestamp is valid (not NaN and reasonable range)
 */
export function isValidTimestamp(timestamp: number): boolean {
  return !isNaN(timestamp) && timestamp > 0 && timestamp < 4102444800000; // Before year 2100
}

/**
 * Create a Unix timestamp from date components (UTC)
 */
export function fromDateComponents(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).getTime();
}
