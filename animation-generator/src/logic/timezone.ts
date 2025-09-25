/**
 * Utility functions for timezone-aware date calculations
 */

/**
 * Convert a UTC date to a local date string in YYYY-MM-DD format
 * based on the specified timezone
 */
export function getLocalDateKey(utcDate: Date, timezone: string): string {
	try {
		// Create a new date in the specified timezone
		const localDate = new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));

		// Format as YYYY-MM-DD
		const year = localDate.getFullYear();
		const month = String(localDate.getMonth() + 1).padStart(2, '0');
		const day = String(localDate.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	} catch (error) {
		console.error(`Failed to convert date to timezone ${timezone}:`, error);
		// Fallback to UTC date if timezone conversion fails
		return utcDate.toISOString().split('T')[0];
	}
}

/**
 * Convert a UTC timestamp (milliseconds) to a local date string in YYYY-MM-DD format
 * based on the specified timezone
 */
export function getLocalDateKeyFromTimestamp(utcTimestamp: number, timezone: string): string {
	return getLocalDateKey(new Date(utcTimestamp), timezone);
}

/**
 * Convert a UTC ISO string to a local date string in YYYY-MM-DD format
 * based on the specified timezone
 */
export function getLocalDateKeyFromISOString(utcISOString: string, timezone: string): string {
	return getLocalDateKey(new Date(utcISOString), timezone);
}
