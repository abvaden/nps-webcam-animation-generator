import { IRepository } from "../db/repositories";
import { WebcamDto } from "..//db/schema";
import { calculateImageHash, guessExt } from "../logic/image";
import { R2CallTracker } from "../logic/r2-tracker";
import { shouldCaptureImage } from "../logic/tasks";

/**
 * Main processing function for all webcams
 */
export async function processAllWebcams(repo: IRepository, bucket: R2Bucket): Promise<void> {
	console.log("Starting webcam processing cycle");

	try {
		// Get all enabled webcams from D1
		const webcams = await repo.webcams.getEnabledWebcams();
		console.log(`Found ${webcams.length} enabled webcams`);

		// Process each webcam independently
		const results = await Promise.allSettled(
			webcams.map(webcam => processWebcam(repo, bucket, webcam))
		);

		// Log overall results
		const successful = results.filter(r => r.status === 'fulfilled').length;
		const failed = results.filter(r => r.status === 'rejected').length;
		console.log(`Webcam processing complete: ${successful} successful, ${failed} failed`);

	} catch (error) {
		console.error("Critical error in webcam processing:", error);
		// Log system-level error but don't throw - let worker continue
	}
}

/**
 * Process a single webcam
 */
export async function processWebcam(repo: IRepository, bucket: R2Bucket, webcam: WebcamDto): Promise<void> {
	const startTime = Date.now();
	const r2Tracker = new R2CallTracker(bucket);

	try {
		console.log(`Processing webcam: ${webcam.name}`);

		const imageReport = await captureWebCamImage(webcam, repo, r2Tracker);

		// Update diagnostics with R2 call classification
		await repo.diagnostics.updateWebcamDiagnostics(
			webcam.id,
			imageReport ? 1 : 0, // imagesCaptured
			imageReport ? 0 : 1, // imagesSkipped
			r2Tracker.getTotalClassACalls(),
			r2Tracker.getTotalClassBCalls(),
			imageReport?.imageSize ?? 0,
			imageReport?.imageSize ?? 0, // bytesStored
			0,
			0
		);

		const processingTime = Date.now() - startTime;
		console.log(`${webcam.name}: Processing completed in ${processingTime}ms (Class A: ${r2Tracker.getTotalClassACalls()}, Class B: ${r2Tracker.getTotalClassBCalls()})`);

	} catch (error) {
		console.error(`${webcam.name}: Processing failed:`, error);

		// Log error to database
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		await repo.diagnostics.logWebcamError(webcam.id, 'processing_error', errorMessage, JSON.stringify({
			stack: errorStack,
			processingTime: Date.now() - startTime,
			r2CallsMade: r2Tracker.getTotalCalls()
		}));

		// Log error activity
		await repo.diagnostics.logWebcamActivity(webcam.id, 'error', null, 0, r2Tracker.getTotalCalls(), `Processing error: ${errorMessage}`);
	}
}


async function captureWebCamImage(webcam: WebcamDto, repo: IRepository, r2Tracker: R2CallTracker): Promise<null | { imageSize: number, }> {
	// Check if it's time to capture
	const shouldCaptureWebcam = shouldCaptureImage(webcam);
	if (!shouldCaptureWebcam.shouldCapture) {
		console.log(`Skipping ${webcam.name} - ${shouldCaptureWebcam.reason}`);
		return null;
	}

	// Fetch image from webcam
	const res = await fetch(webcam.url, { cache: "no-cache" });

	if (res.status === 304) {
		console.log(`${webcam.name}: Image not modified (304)`);
		await repo.diagnostics.logWebcamActivity(webcam.id, 'image_skipped', null, 0, 0, 'HTTP 304 - Not Modified');
		return null;
	}

	if (!res.ok) {
		throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
	}

	// Get image data and metadata
	const contentType = res.headers.get("content-type") || "application/octet-stream";
	const body = await res.arrayBuffer();
	const imageSize = body.byteLength;

	// Calculate hash for duplicate detection
	const newImageHash = await calculateImageHash(body);

	// Check if image is identical to last saved image
	if (webcam.lastImageHash && newImageHash === webcam.lastImageHash) {
		console.log(`${webcam.name}: Image unchanged (hash: ${newImageHash.substring(0, 8)}...), skipping save`);

		// Log skipped image
		await repo.diagnostics.logWebcamActivity(webcam.id, 'image_skipped', newImageHash, imageSize, r2Tracker.getTotalCalls(), 'Duplicate image detected');
		await repo.diagnostics.updateWebcamDiagnostics(webcam.id, 0, 1, r2Tracker.getTotalClassACalls(), r2Tracker.getTotalClassBCalls(), 0, 0, 0, 0);
		return null;
	}

	console.log(`${webcam.name}: Image changed, saving new image (hash: ${newImageHash.substring(0, 8)}...)`);

	// Save images to R2 using tracker

	// Save timestamped history if enabled
	const unixTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
	const ext = guessExt(contentType);
	const historyKey = `images/romo/${webcam.name}/${unixTimestamp}${ext}`;

	// Save timestamped history (Class A operation)
	await r2Tracker.putObject(historyKey, body, {
		httpMetadata: { contentType },
		customMetadata: {
			imageHash: newImageHash,
			unixTimestamp: unixTimestamp.toString()
		}
	});

	// Add image to images table in database
	try {
		await repo.imageRepository.addImageToDatabase(webcam.id, unixTimestamp, historyKey);
	} catch (error) {
		console.error(`Failed to add image to database for ${webcam.name}:`, error);
		// Continue processing even if database insertion fails
	}

	// Update webcam status in database
	await repo.webcams.updateWebcamStatus(webcam.id, newImageHash);

	// Calculate costs and update diagnostics

	const totalR2Calls = r2Tracker.getTotalCalls();

	// Log successful capture
	await repo.diagnostics.logWebcamActivity(webcam.id, 'image_captured', newImageHash, imageSize, totalR2Calls, 'Image successfully captured and saved');

	return { imageSize };
}
