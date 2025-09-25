import { WebcamDto } from "../db/schema";
import { calculateWebcamSolarTimes, isDaylight } from "./solar-calculations";
import { diffInMinutes, now } from "./timestamp";

/**
 * This function is used to determine if image from the webcam should be captured.
 * The webcam image should only be updated when the following conditions are met.
 * - The webcam is enabled
 * - The current time is > the last active time + webcam.interval_minutes
 * - The current time is between firstLight and lastLight given the webcams lat and log
 */
export function shouldCaptureImage(webcam: WebcamDto): { shouldCapture: boolean, reason: string} {
  if (!webcam.lastActiveAt) {
    return {shouldCapture: true, reason: 'first capture'}; // First capture
  }

  const currentTime = now();
  const lastActiveTimestamp = new Date(webcam.lastActiveAt).getTime();
  const minutesSinceLastCapture = diffInMinutes(currentTime, lastActiveTimestamp);

  if (minutesSinceLastCapture <= (webcam.intervalMinutes || 1)) {
    return {shouldCapture: false, reason: 'web cam interval'};
  }

  if (!webcam.latLon) {
    return {shouldCapture: true, reason: 'time expired'};
  }

  const solarTimes = calculateWebcamSolarTimes(webcam.latLon, currentTime);
  if (!solarTimes) {
    return {shouldCapture: true, reason: 'time expired and no location data'};
  }

  const shouldCapture = isDaylight(webcam.latLon, currentTime);
  return {shouldCapture, reason: shouldCapture ? 'time expired and sun is up' : 'sun below horizon'};
}
