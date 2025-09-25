// Solar position calculations for sunrise, sunset, and twilight times
import * as SunCalc from 'suncalc';
import { toDate } from './timestamp';

/**
 * Solar times interface defining all calculated solar events
 * All times are Unix timestamps in milliseconds (UTC)
 */
export interface SolarTimes {
  sunrise: number;
  sunset: number;
  firstLight: number;      // Astronomical dawn (-18°)
  lastLight: number;       // Astronomical dusk (-18°)
  dayLength: number;       // Hours of daylight
}

/**
 * Calculate solar times for a given location and date
 * All input timestamps are assumed to be UTC and all returned times are UTC timestamps
 */
export function calculateSolarTimes(
  latitude: number,
  longitude: number,
  timestamp: number
): SolarTimes {
  // Validate inputs
  if (Math.abs(latitude) > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
  if (Math.abs(longitude) > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }

  // Convert timestamp to Date for SunCalc (it expects a Date object)
  const date = toDate(timestamp);

  // Get solar times using SunCalc
  const times = SunCalc.getTimes(date, latitude, longitude);

  // Convert all times to Unix timestamps, handling null values
  const sunrise = times.sunrise ? times.sunrise.getTime() : NaN;
  const sunset = times.sunset ? times.sunset.getTime() : NaN;
  const firstLight = times.nauticalDawn ? times.nauticalDawn.getTime() : NaN;
  const lastLight = times.nauticalDusk ? times.nauticalDusk.getTime() : NaN;

  // Calculate day length in hours
  const dayLength = (sunrise && sunset) ? (sunset - sunrise) / (1000 * 60 * 60) : 0;

  return {
    sunrise,
    sunset,
    firstLight,
    lastLight,
    dayLength
  };
}

/**
 * Parse latitude and longitude from various string formats
 */
export function parseLatLon(latLonString: string): { latitude: number; longitude: number } {
  if (!latLonString) {
    throw new Error('Latitude/longitude string is required');
  }

  // Remove whitespace and split by comma
  const parts = latLonString.trim().split(',').map(part => part.trim());

  if (parts.length !== 2) {
    throw new Error(`Invalid lat/lon format: ${latLonString}. Expected format: "lat,lon"`);
  }

  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error(`Invalid numeric values in lat/lon: ${latLonString}`);
  }

  return { latitude, longitude };
}

/**
 * Calculate solar times for a webcam using its stored location data
 * All input timestamps are assumed to be UTC and all returned times are UTC timestamps
 */
export function calculateWebcamSolarTimes(
  latLonString: string | null,
  timestamp: number
): SolarTimes | null {
  if (!latLonString) {
    return null;
  }

  try {
    const { latitude, longitude } = parseLatLon(latLonString);
    return calculateSolarTimes(latitude, longitude, timestamp);
  } catch (error) {
    console.error('Error calculating solar times:', error);
    return null;
  }
}

/**
 * Check if it's currently daylight at a given location
 * All input timestamps are assumed to be UTC
 */
export function isDaylight(
  latLonString: string | null,
  currentTimestamp: number
): boolean {
  const solarTimes = calculateWebcamSolarTimes(latLonString, currentTimestamp);

  if (!solarTimes || isNaN(solarTimes.firstLight) || isNaN(solarTimes.lastLight)) {
    return true; // Default to daylight if calculation fails
  }

	const sunriseDuration = solarTimes.sunrise - solarTimes.firstLight;
	const sunsetDuration = solarTimes.lastLight - solarTimes.sunset;

	const lightStart = solarTimes.firstLight - (0.25 * sunriseDuration);
	const lightEnd = solarTimes.lastLight + (0.25 * sunsetDuration);

  return currentTimestamp >= lightStart && currentTimestamp <= lightEnd;
}
