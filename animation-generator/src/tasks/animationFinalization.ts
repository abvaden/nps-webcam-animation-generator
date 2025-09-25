import { IRepository } from "../db/repositories";
import { AnimationType } from "../types";
import { desampleImageKeys, hasMinimumImages } from "../logic/animations";

/**
 * This function will set all of the animations where the status is set to 'waiting_for_images' and the time has passed to 'waiting_for_images'
 * It will also scan the images table to collect all of the images that are supposed to be included in the animation and update the table accordingly
 */
export async function prepareAnimationsForPendingQueue(repo: IRepository, now: Date): Promise<void> {

	try {
		// This should be a database operation to get all of the animations in the animation creation queue where status is 'waiting_for_images' and
		// the scheduled time is <= the current time
		const animations = await repo.animationQueue.getWaitingAnimations(now);

		if (animations.length === 0) {
			console.log('No waiting animations ready for processing');
			return;
		}

		let processedCount = 0;
		let pendingCount = 0;
		let failedCount = 0;

		// for each animation we should query the images table and get all of the images for that webcam within the animations start and end time
		// we will update the image list on the animation with the images, set the status to pending, and save to the database
		for (const animation of animations) {
			try {
				// Get webcam details for the image query

				const webcam = await repo.webcams.getWebcamById(animation.webcamId);

				if (!webcam) {
					console.error(`Webcam not found for animation ${animation.id} (webcam_id: ${animation.webcamId})`);
					await repo.animationQueue.updateAnimationWithImages(animation.id, 'failed', [], 'Webcam not found');
					failedCount++;
					continue;
				}

				if (!animation.startTime || !animation.endTime) {
					throw new Error('start or end time not defined');
				}


				// Query images table for this webcam within the time range
				const images = await repo.imageRepository.getImagesForTimeRange(webcam, animation.startTime, animation.endTime);
				const imageKeys = images.map(x => x.objectName);

				// We should calculate the total number of images in the animation / animation based off the fixed framerate of 15 fps and the length of time
				// the animation should play for i.e. animation.totalTime
				var totalImages = 10; // sample value for now
				switch (animation.gifType)
				{
					case 'full_day':
						totalImages = Math.min(10 * 15, imageKeys.length);;
						break;
					case 'hourly' :
						totalImages = Math.min(4 * 15, imageKeys.length);
					case 'sunrise' :
					case 'sunset' :
						Math.min(8 * 15, imageKeys.length);
					case 'on_demand':
					default:
						totalImages = imageKeys.length;
				}


				// Desample the images to get evenly distributed subset
				const selectedImageKeys = desampleImageKeys(imageKeys, totalImages);

				// Check if we have sufficient images for this GIF type
				if (hasMinimumImages(animation.gifType as AnimationType, selectedImageKeys.length)) {
					// Update animation with selected images and set status to pending
					await repo.animationQueue.updateAnimationWithImages(animation.id, 'pending', selectedImageKeys);
					pendingCount++;
				} else {
					// Mark as failed due to insufficient images
					const errorMessage = `Insufficient images: found ${selectedImageKeys.length} after desampling from ${imageKeys.length}, required minimum for ${animation.gifType}`;
					await repo.animationQueue.updateAnimationWithImages(animation.id, 'failed', [], errorMessage);
					failedCount++;
				}

				processedCount++;

			} catch (error) {
				console.error(`Failed to process waiting GIF ${animation.id}:`, error);
				const errorMessage = error instanceof Error ? error.message : String(error);
				await repo.animationQueue.updateAnimationWithImages(animation.id, 'failed', [], `Processing error: ${errorMessage}`);
				failedCount++;
			}
		}

		console.log(`Processed ${processedCount} waiting animations: ${pendingCount} moved to pending, ${failedCount} marked as failed`);

	} catch (error) {
		console.error('Failed to prepare animations for pending queue:', error);
	}
}
