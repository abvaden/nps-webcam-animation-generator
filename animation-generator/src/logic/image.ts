// Utility functions for image processing and manipulation

/**
 * Calculates SHA-256 hash of image data for duplicate detection
 */
export async function calculateImageHash(imageData: ArrayBuffer): Promise<string> {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', imageData);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error("Failed to calculate image hash:", error);
    return Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Guesses file extension from content type
 */
export function guessExt(contentType: string): string {
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webp")) return ".webp";
  return "";
}




/**
 * Extract Unix timestamp from image key filename
 * Expected format: images/romo/{webcam.name}/{unixTimestamp}{ext}
 */
export function extractTimestampFromImageKey(imageKey: string): number | null {
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
