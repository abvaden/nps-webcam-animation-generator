import { Image } from "@/db/schema";
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
// export function desampleImageKeys(sourceImages: Image[], totalImages: number, start: number, end: number): Image[] {
// 	// Handle edge cases
// 	if (sourceImages.length === 0 || totalImages <= 0) {
// 		return [];
// 	}

// 	// If we have fewer or equal images than requested, return all of them
// 	if (sourceImages.length <= totalImages) {
// 		return [...sourceImages];
// 	}

// 	// Parse timestamps from image keys and create objects with both timestamp and original key
// 	const imagesWithTimestamps = sourceImages.filter(x => x.timeStamp != null);

// 	// If no valid timestamps found, return empty array
// 	if (imagesWithTimestamps.length === 0) {
// 		return [];
// 	}

// 	// Sort by timestamp to ensure chronological order
// 	imagesWithTimestamps.sort((a, b) => a.timeStamp - b.timeStamp);

// 	// If we have fewer valid images than requested, return all valid ones
// 	if (imagesWithTimestamps.length <= totalImages) {
// 		return imagesWithTimestamps;
// 	}

// 	// Calculate time span and interval
// 	const firstTimestamp = imagesWithTimestamps[0].timeStamp;
// 	const lastTimestamp = imagesWithTimestamps[imagesWithTimestamps.length - 1].timeStamp;
// 	const timeSpan = end - start;

// 	// If all images have the same timestamp, return the first totalImages
// 	if (timeSpan === 0) {
// 		return imagesWithTimestamps.slice(0, totalImages);
// 	}

// 	const selectedImages: Image[] = [];

// 	// Always include the first image
// 	selectedImages.push(imagesWithTimestamps[0]);

// 	// If we only need 1 image, return the first one
// 	if (totalImages === 1) {
// 		return selectedImages;
// 	}

// 	// If we need 2 images, return first and last
// 	if (totalImages === 2) {
// 		selectedImages.push(imagesWithTimestamps[imagesWithTimestamps.length - 1]);
// 		return selectedImages;
// 	}

// 	// For 3 or more images, distribute evenly across the time range
// 	const interval = timeSpan / (totalImages - 1);

// 	// Select images at calculated intervals (skip first since we already added it)
// 	for (let i = 1; i < totalImages - 1; i++) {
// 		const targetTimestamp = firstTimestamp + (interval * i);

// 		// Find the image closest to the target timestamp
// 		let closestImage = imagesWithTimestamps[0];
// 		let minDifference = Math.abs(imagesWithTimestamps[0].timeStamp - targetTimestamp);

// 		for (const img of imagesWithTimestamps) {
// 			const difference = Math.abs(img.timeStamp - targetTimestamp);
// 			if (difference < minDifference) {
// 				minDifference = difference;
// 				closestImage = img;
// 			}
// 		}
// 	}

// 	// Always include the last image (avoid duplicates)
// 	const lastImage = imagesWithTimestamps[imagesWithTimestamps.length - 1];
// 	if (!selectedImages.includes(lastImage)) {
// 		selectedImages.push(lastImage);
// 	}

// 	return selectedImages;
// }


export function interpolateImages(sourceImages: Image[], totalImages: number, start: number, end: number): Image[] {
	// Handle edge cases
	if (sourceImages.length === 0 || totalImages <= 0) {
		return [];
	}

	// Parse timestamps from image keys and create objects with both timestamp and original key
	const imagesWithTimestamps = sourceImages.filter(x => x.timeStamp != null);

	// If no valid timestamps found, return empty array
	if (imagesWithTimestamps.length === 0) {
		return [];
	}

	// Sort by timestamp to ensure chronological order
	imagesWithTimestamps.sort((a, b) => a.timeStamp - b.timeStamp);

	// Calculate time span and interval
	const interval = (end - start) / totalImages;

	const returnImages = [];
	let targetTimestamp = start;
	while (targetTimestamp <= end)
	{
		if (imagesWithTimestamps[0].timeStamp > targetTimestamp) {
			returnImages.push(imagesWithTimestamps[0]);
			targetTimestamp = targetTimestamp + interval;
			continue;
		}

		if (imagesWithTimestamps[imagesWithTimestamps.length - 1].timeStamp < targetTimestamp) {
			returnImages.push(imagesWithTimestamps[imagesWithTimestamps.length - 1]);
			targetTimestamp = targetTimestamp + interval;
			continue;
		}

		let targetImage: Image | null = null;
		for (let i = 0; i < imagesWithTimestamps.length - 1; i++) {
			const thisImage = imagesWithTimestamps[i];
			const nextImage = imagesWithTimestamps[i+1];

			if (thisImage.timeStamp <= targetTimestamp && nextImage.timeStamp > targetTimestamp) {
				targetImage = thisImage
				break;
			}
		}

		if (!targetImage) {
			console.log('No target image found');
			continue;
		}

		returnImages.push(targetImage);
		targetTimestamp = targetTimestamp + interval;
	}

	return returnImages;
}
