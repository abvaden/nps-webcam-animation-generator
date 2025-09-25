import { AnimationType } from "../types";
import { extractTimestampFromImageKey } from "./image";

/**
 * Check if an animation type has the minimum required images
 */
export function hasMinimumImages(animationType: AnimationType, imageCount: number): boolean {
  const minimums = {
	'hourly': 5,
	'sunrise': 3,
	'sunset': 3,
	'full_day': 10,
	'on_demand': 3
  };

  return imageCount >= minimums[animationType];
}

/**
 * Generate a storage key for an animation in R2
 */
export function generateAnimationStorageKey(
  nationalPark: string,
  webcamName: string,
  animationType: AnimationType,
  dateStamp: string,
  hourStr?: string,
): string {
  if (animationType == 'hourly') {
	return `gifs/${nationalPark}/${webcamName}/${animationType}/${dateStamp}_${hourStr}.mp4`;
  } else {
	return `gifs/${nationalPark}/${webcamName}/${animationType}/${dateStamp}.mp4`;
  }

}

// This function should parse the timestamp in the image keys provided and return a fixed amount of across the entire time range
// that are as evenly distributed as possible
export function desampleImageKeys(sourceImages: string[], totalImages: number): string[] {
	// Handle edge cases
	if (sourceImages.length === 0 || totalImages <= 0) {
		return [];
	}

	// If we have fewer or equal images than requested, return all of them
	if (sourceImages.length <= totalImages) {
		return [...sourceImages];
	}

	// Parse timestamps from image keys and create objects with both timestamp and original key
	const imagesWithTimestamps: { timestamp: number; key: string }[] = [];

	for (const imageKey of sourceImages) {
		const timestamp = extractTimestampFromImageKey(imageKey);
		if (timestamp !== null) {
			imagesWithTimestamps.push({ timestamp, key: imageKey });
		}
	}

	// If no valid timestamps found, return empty array
	if (imagesWithTimestamps.length === 0) {
		return [];
	}

	// Sort by timestamp to ensure chronological order
	imagesWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);

	// If we have fewer valid images than requested, return all valid ones
	if (imagesWithTimestamps.length <= totalImages) {
		return imagesWithTimestamps.map(img => img.key);
	}

	// Calculate time span and interval
	const firstTimestamp = imagesWithTimestamps[0].timestamp;
	const lastTimestamp = imagesWithTimestamps[imagesWithTimestamps.length - 1].timestamp;
	const timeSpan = lastTimestamp - firstTimestamp;

	// If all images have the same timestamp, return the first totalImages
	if (timeSpan === 0) {
		return imagesWithTimestamps.slice(0, totalImages).map(img => img.key);
	}

	const selectedImages: string[] = [];

	// Always include the first image
	selectedImages.push(imagesWithTimestamps[0].key);

	// If we only need 1 image, return the first one
	if (totalImages === 1) {
		return selectedImages;
	}

	// If we need 2 images, return first and last
	if (totalImages === 2) {
		selectedImages.push(imagesWithTimestamps[imagesWithTimestamps.length - 1].key);
		return selectedImages;
	}

	// For 3 or more images, distribute evenly across the time range
	const interval = timeSpan / (totalImages - 1);

	// Select images at calculated intervals (skip first since we already added it)
	for (let i = 1; i < totalImages - 1; i++) {
		const targetTimestamp = firstTimestamp + (interval * i);

		// Find the image closest to the target timestamp
		let closestImage = imagesWithTimestamps[0];
		let minDifference = Math.abs(imagesWithTimestamps[0].timestamp - targetTimestamp);

		for (const img of imagesWithTimestamps) {
			const difference = Math.abs(img.timestamp - targetTimestamp);
			if (difference < minDifference) {
				minDifference = difference;
				closestImage = img;
			}
		}

		// Avoid duplicates
		if (!selectedImages.includes(closestImage.key)) {
			selectedImages.push(closestImage.key);
		}
	}

	// Always include the last image (avoid duplicates)
	const lastImage = imagesWithTimestamps[imagesWithTimestamps.length - 1].key;
	if (!selectedImages.includes(lastImage)) {
		selectedImages.push(lastImage);
	}

	return selectedImages;
}
