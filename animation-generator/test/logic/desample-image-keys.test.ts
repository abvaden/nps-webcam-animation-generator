// Unit tests for desampleImageKeys function

import { describe, it, expect } from 'vitest';

// Import the functions we need to test
// Since they're not exported, we'll need to copy them for testing
// In a real scenario, you'd export these functions from worker.ts or move them to a separate utility file

/**
 * Extract Unix timestamp from image key filename
 * Expected format: images/romo/{webcam.name}/{unixTimestamp}{ext}
 */
function extractTimestampFromImageKey(imageKey: string): number | null {
	try {
		// Split by '/' and get the filename (last part)
		const parts = imageKey.split('/');
		const filename = parts[parts.length - 1];

		// Extract timestamp by removing file extension
		const timestampMatch = filename.match(/^(\d+)\.[a-zA-Z]+$/);

		if (timestampMatch && timestampMatch[1]) {
			const timestamp = parseInt(timestampMatch[1], 10);
			return isNaN(timestamp) ? null : timestamp;
		}

		return null;
	} catch (error) {
		return null;
	}
}

/**
 * This function should parse the timestamp in the image keys provided and return a fixed amount of across the entire time range
 * that are as evenly distributed as possible
 */
function desampleImageKeys(sourceImages: string[], totalImages: number): string[] {
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

describe('extractTimestampFromImageKey', () => {
	it('should extract timestamp from valid image keys', () => {
		expect(extractTimestampFromImageKey('images/romo/webcam1/1609459200.jpg')).toBe(1609459200);
		expect(extractTimestampFromImageKey('images/romo/webcam2/1609459260.png')).toBe(1609459260);
		expect(extractTimestampFromImageKey('images/romo/test-cam/1609459320.gif')).toBe(1609459320);
		expect(extractTimestampFromImageKey('images/romo/another-cam/1609459380.webp')).toBe(1609459380);
	});

	it('should handle different file extensions', () => {
		expect(extractTimestampFromImageKey('images/romo/cam/1609459200.jpg')).toBe(1609459200);
		expect(extractTimestampFromImageKey('images/romo/cam/1609459200.jpeg')).toBe(1609459200);
		expect(extractTimestampFromImageKey('images/romo/cam/1609459200.png')).toBe(1609459200);
		expect(extractTimestampFromImageKey('images/romo/cam/1609459200.gif')).toBe(1609459200);
		expect(extractTimestampFromImageKey('images/romo/cam/1609459200.webp')).toBe(1609459200);
	});

	it('should return null for invalid formats', () => {
		expect(extractTimestampFromImageKey('invalid-key')).toBe(null);
		expect(extractTimestampFromImageKey('images/romo/cam/notanumber.jpg')).toBe(null);
		expect(extractTimestampFromImageKey('images/romo/cam/1609459200')).toBe(null); // No extension
		expect(extractTimestampFromImageKey('images/romo/cam/.jpg')).toBe(null); // No timestamp
		expect(extractTimestampFromImageKey('')).toBe(null);
	});

	it('should handle edge cases', () => {
		expect(extractTimestampFromImageKey('images/romo/cam/0.jpg')).toBe(0);
		expect(extractTimestampFromImageKey('images/romo/cam/999999999999.jpg')).toBe(999999999999);
		expect(extractTimestampFromImageKey('images/romo/cam-with-dashes/1609459200.jpg')).toBe(1609459200);
	});

	it('should handle malformed paths gracefully', () => {
		expect(extractTimestampFromImageKey('1609459200.jpg')).toBe(1609459200); // Just filename
		expect(extractTimestampFromImageKey('/path/to/1609459200.jpg')).toBe(1609459200); // Different path structure
	});
});

describe('desampleImageKeys', () => {
	// Helper function to create test image keys with timestamps
	const createImageKey = (timestamp: number, webcam = 'test-cam', ext = 'jpg') =>
		`images/romo/${webcam}/${timestamp}.${ext}`;

	describe('edge cases', () => {
		it('should return empty array for empty input', () => {
			expect(desampleImageKeys([], 5)).toEqual([]);
		});

		it('should return empty array for zero or negative totalImages', () => {
			const images = [createImageKey(1609459200), createImageKey(1609459260)];
			expect(desampleImageKeys(images, 0)).toEqual([]);
			expect(desampleImageKeys(images, -1)).toEqual([]);
		});

		it('should return all images if totalImages >= sourceImages length', () => {
			const images = [createImageKey(1609459200), createImageKey(1609459260)];
			expect(desampleImageKeys(images, 2)).toEqual(images);
			expect(desampleImageKeys(images, 3)).toEqual(images);
		});

		it('should return empty array if no valid timestamps found', () => {
			const invalidImages = ['invalid-key-1', 'invalid-key-2', 'invalid-key-3'];
			expect(desampleImageKeys(invalidImages, 2)).toEqual([]);
		});
	});

	describe('single image selection', () => {
		it('should return first image when totalImages is 1', () => {
			const images = [
				createImageKey(1609459200), // First
				createImageKey(1609459260),
				createImageKey(1609459320)  // Last
			];
			const result = desampleImageKeys(images, 1);
			expect(result).toEqual([createImageKey(1609459200)]);
		});
	});

	describe('two image selection', () => {
		it('should return first and last images when totalImages is 2', () => {
			const images = [
				createImageKey(1609459200), // First
				createImageKey(1609459260),
				createImageKey(1609459320),
				createImageKey(1609459380)  // Last
			];
			const result = desampleImageKeys(images, 2);
			expect(result).toEqual([
				createImageKey(1609459200),
				createImageKey(1609459380)
			]);
		});
	});

	describe('multiple image selection', () => {
		it('should distribute images evenly across time range', () => {
			// Create images every 60 seconds for 10 minutes (11 images total)
			const images = [];
			for (let i = 0; i <= 10; i++) {
				images.push(createImageKey(1609459200 + (i * 60)));
			}

			const result = desampleImageKeys(images, 5);
			expect(result).toHaveLength(5);

			// Should include first and last
			expect(result[0]).toBe(createImageKey(1609459200)); // First
			expect(result[result.length - 1]).toBe(createImageKey(1609459200 + (10 * 60))); // Last
		});

		it('should handle uneven time distribution', () => {
			const images = [
				createImageKey(1609459200), // 0 seconds
				createImageKey(1609459230), // 30 seconds
				createImageKey(1609459260), // 60 seconds
				createImageKey(1609459500), // 300 seconds (big gap)
				createImageKey(1609459800)  // 600 seconds
			];

			const result = desampleImageKeys(images, 3);
			expect(result).toHaveLength(3);
			expect(result[0]).toBe(createImageKey(1609459200)); // First
			expect(result[result.length - 1]).toBe(createImageKey(1609459800)); // Last
		});
	});

	describe('chronological ordering', () => {
		it('should sort images by timestamp before processing', () => {
			// Provide images in random order
			const images = [
				createImageKey(1609459320), // Middle
				createImageKey(1609459200), // First
				createImageKey(1609459380), // Last
				createImageKey(1609459260)  // Second
			];

			const result = desampleImageKeys(images, 2);
			expect(result).toEqual([
				createImageKey(1609459200), // First chronologically
				createImageKey(1609459380)  // Last chronologically
			]);
		});
	});

	describe('duplicate handling', () => {
		it('should avoid selecting duplicate images', () => {
			// Create scenario where multiple images might map to same target
			const images = [
				createImageKey(1609459200), // 0 seconds
				createImageKey(1609459201), // 1 second (very close to first)
				createImageKey(1609459800)  // 600 seconds
			];

			const result = desampleImageKeys(images, 3);
			expect(result).toHaveLength(3);
			expect(new Set(result).size).toBe(3); // All unique
		});
	});

	describe('same timestamp handling', () => {
		it('should handle images with identical timestamps', () => {
			const sameTimestamp = 1609459200;
			const images = [
				createImageKey(sameTimestamp, 'cam1'),
				createImageKey(sameTimestamp, 'cam2'),
				createImageKey(sameTimestamp, 'cam3'),
				createImageKey(sameTimestamp, 'cam4')
			];

			const result = desampleImageKeys(images, 2);
			expect(result).toHaveLength(2);
			// Should return first 2 images since timeSpan is 0
			expect(result).toEqual([
				createImageKey(sameTimestamp, 'cam1'),
				createImageKey(sameTimestamp, 'cam2')
			]);
		});
	});

	describe('mixed file extensions', () => {
		it('should handle different file extensions correctly', () => {
			const images = [
				createImageKey(1609459200, 'cam', 'jpg'),
				createImageKey(1609459260, 'cam', 'png'),
				createImageKey(1609459320, 'cam', 'gif'),
				createImageKey(1609459380, 'cam', 'webp')
			];

			const result = desampleImageKeys(images, 2);
			expect(result).toEqual([
				createImageKey(1609459200, 'cam', 'jpg'),
				createImageKey(1609459380, 'cam', 'webp')
			]);
		});
	});

	describe('large dataset performance', () => {
		it('should handle large arrays efficiently', () => {
			// Create 1000 images over 24 hours
			const images = [];
			const startTime = 1609459200;
			const interval = 86.4; // 86.4 seconds between images for 24 hours

			for (let i = 0; i < 1000; i++) {
				images.push(createImageKey(Math.floor(startTime + (i * interval))));
			}

			const result = desampleImageKeys(images, 10);
			expect(result).toHaveLength(10);

			// Verify first and last are included
			expect(result[0]).toBe(createImageKey(startTime));
			expect(result[result.length - 1]).toBe(createImageKey(Math.floor(startTime + (999 * interval))));
		});
	});

	describe('real-world scenarios', () => {
		it('should handle typical hourly GIF scenario', () => {
			// Simulate 1 hour of images, one every 2 minutes (30 images)
			const images = [];
			const startTime = 1609459200; // Start time

			for (let i = 0; i < 30; i++) {
				images.push(createImageKey(startTime + (i * 120))); // Every 2 minutes
			}

			// Want 15 images for 15fps * 1 second animation
			const result = desampleImageKeys(images, 15);
			expect(result).toHaveLength(15);

			// Verify even distribution
			const timestamps = result.map(key => extractTimestampFromImageKey(key)!);
			const intervals = [];
			for (let i = 1; i < timestamps.length; i++) {
				intervals.push(timestamps[i] - timestamps[i - 1]);
			}

			// Intervals should be relatively consistent (allowing for some variance due to discrete selection)
			const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
			const expectedInterval = (3600 - 120) / (15 - 1); // Total time span / (images - 1)

			// Allow 20% variance
			expect(Math.abs(avgInterval - expectedInterval)).toBeLessThan(expectedInterval * 0.2);
		});

		it('should handle sunrise GIF scenario with sparse images', () => {
			// Simulate sunrise period with fewer images at the beginning and end
			const images = [
				createImageKey(1609459200), // Dawn
				createImageKey(1609459500), // 5 minutes later
				createImageKey(1609459800), // 5 minutes later
				createImageKey(1609460400), // 10 minutes later (sunrise peak)
				createImageKey(1609460700), // 5 minutes later
				createImageKey(1609461000)  // End
			];

			const result = desampleImageKeys(images, 4);
			expect(result).toHaveLength(4);
			expect(result[0]).toBe(createImageKey(1609459200)); // First
			expect(result[result.length - 1]).toBe(createImageKey(1609461000)); // Last
		});
	});

	describe('error resilience', () => {
		it('should handle mixed valid and invalid image keys', () => {
			const images = [
				createImageKey(1609459200), // Valid
				'invalid-key-1',            // Invalid
				createImageKey(1609459260), // Valid
				'invalid-key-2',            // Invalid
				createImageKey(1609459320)  // Valid
			];

			const result = desampleImageKeys(images, 2);
			expect(result).toHaveLength(2);
			expect(result[0]).toBe(createImageKey(1609459200));
			expect(result[result.length - 1]).toBe(createImageKey(1609459320));
		});

		it('should handle malformed timestamps gracefully', () => {
			const images = [
				createImageKey(1609459200),
				'images/romo/cam/abc.jpg', // Invalid timestamp
				createImageKey(1609459260),
				'images/romo/cam/.jpg',    // Empty timestamp
				createImageKey(1609459320)
			];

			const result = desampleImageKeys(images, 3);
			expect(result).toHaveLength(3);
			// Should only process valid timestamps
			expect(result).toEqual([
				createImageKey(1609459200),
				createImageKey(1609459260),
				createImageKey(1609459320)
			]);
		});
	});
});
