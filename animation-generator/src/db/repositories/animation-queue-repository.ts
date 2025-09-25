import { eq, and, lte, desc, asc } from 'drizzle-orm';
import type { Database } from '../connection';
import { gifCreationQueue, webcams } from '../schema';
import type { GifCreationQueue } from '../schema';
import { getLocalDateKeyFromISOString } from '../../logic/timezone';
import { AnimationQueueEntry, AnimationStatus, AnimationType } from '../../types';


export interface IAnimationQueueRepository {
	addAnimationsToQueue(animations: AnimationQueueEntry[]): Promise<boolean>;
	getPendingAnimations(): Promise<GifCreationQueue[]>;
	getWaitingAnimations(currentTime: Date): Promise<GifCreationQueue[]>;
	updateAnimationStatus(
		id: number,
		status: AnimationStatus,
		errorMessage?: string
	): Promise<void>;
	updateAnimationWithImages(
		id: number,
		status: AnimationStatus,
		imageKeys: string[],
		errorMessage?: string
	): Promise<void>;
	updateAnimationStorageKey(id: number, storageKey: string): Promise<{ success: boolean; message: string }>;
	markAnimationCompleted(id: number): Promise<{ success: boolean; message: string; queue_entry_id?: number; status?: string }>;
	deleteAnimation(id: number): Promise<{ success: boolean; message: string }>;
}

type NewAnimationQueueEntry = typeof gifCreationQueue.$inferInsert;

export class AnimationQueueRepository implements IAnimationQueueRepository {
	constructor(private db: Database) { }

	/**
	 * Add multiple animations to the queue in a batch
	 */
	async addAnimationsToQueue(animations: AnimationQueueEntry[]): Promise<boolean> {
		try {
			for (const animation of animations.map(this.toInsert)) {
				await this.db.insert(gifCreationQueue).values(animation);
			}

			return true;
		} catch (error) {
			console.error('Failed to add batch of animations to queue:', error);
			return false;
		}
	}

	/**
	 * Get pending animations ready to be processed
	 */
	async getPendingAnimations(): Promise<GifCreationQueue[]> {
		try {
			const result = await this.db
				.select()
				.from(gifCreationQueue)
				.where(eq(gifCreationQueue.status, 'pending'))
				.orderBy(asc(gifCreationQueue.scheduledTime))

				.limit(10);

			return result;
		} catch (error) {
			console.error("Failed to fetch pending animations:", error);
			return [];
		}
	}

	/**
	 * Get animations waiting for images that are ready to be processed
	 */
	async getWaitingAnimations(currentTime: Date): Promise<GifCreationQueue[]> {
		try {
			const result = await this.db
				.select()
				.from(gifCreationQueue)
				.where(
					and(
						eq(gifCreationQueue.status, 'waiting_for_images'),
						lte(gifCreationQueue.scheduledTime, currentTime.toISOString())
					)
				)
				.orderBy(asc(gifCreationQueue.scheduledTime));

			return result;
		} catch (error) {
			console.error('Failed to fetch waiting animations:', error);
			return [];
		}
	}

	/**
	 * Update animation status
	 */
	async updateAnimationStatus(
		id: number,
		status: AnimationStatus,
		errorMessage?: string
	): Promise<void> {
		try {
			const processedAt = (status === 'completed' || status === 'failed')
				? new Date().toISOString()
				: null;

			await this.db
				.update(gifCreationQueue)
				.set({
					status,
					processedAt,
					errorMessage: errorMessage || null,
				})
				.where(eq(gifCreationQueue.id, id));
		} catch (error) {
			console.error(`Failed to update animation status:`, error);
		}
	}

	/**
	 * Update animation with images and new status
	 */
	async updateAnimationWithImages(
		id: number,
		status: AnimationStatus,
		imageKeys: string[],
		errorMessage?: string
	): Promise<void> {
		try {
			const processedAt = (status === 'completed' || status === 'failed')
				? new Date().toISOString()
				: null;

			await this.db
				.update(gifCreationQueue)
				.set({
					status,
					imageList: imageKeys,
					processedAt,
					errorMessage: errorMessage || null,
				})
				.where(eq(gifCreationQueue.id, id));
		} catch (error) {
			console.error(`Failed to update animation with images:`, error);
		}
	}

	/**
	 * Update animation storage key
	 */
	async updateAnimationStorageKey(id: number, storageKey: string): Promise<{ success: boolean; message: string }> {
		try {
			// First, get the animation entry to validate it exists
			const animationEntry = await this.db
				.select({
					id: gifCreationQueue.id,
					gifType: gifCreationQueue.gifType,
					nationalPark: webcams.nationalPark,
					webcamName: webcams.name,
				})
				.from(gifCreationQueue)
				.innerJoin(webcams, eq(gifCreationQueue.webcamId, webcams.id))
				.where(eq(gifCreationQueue.id, id))
				.limit(1);

			if (!animationEntry[0]) {
				return {
					success: false,
					message: `Animation queue entry with ID ${id} not found`
				};
			}

			const entry = animationEntry[0];

			// Validate storage key format
			const expectedPattern = `gifs/${entry.nationalPark}/${entry.webcamName}/${entry.gifType}/`;
			if (!storageKey.startsWith(expectedPattern)) {
				return {
					success: false,
					message: `Invalid storage key format. Expected pattern: ${expectedPattern}timestamp.mp4`
				};
			}

			// Extract and validate timestamp from filename
			const filename = storageKey.split('/').pop();
			if (!filename || !filename.match(/^\d+\.mp4$/)) {
				return {
					success: false,
					message: 'Invalid filename format. Expected: timestamp.mp4'
				};
			}

			// Update the storage key
			await this.db
				.update(gifCreationQueue)
				.set({ gifStorageKey: storageKey })
				.where(eq(gifCreationQueue.id, id));

			console.log(`Updated animation storage key for queue entry ${id}: ${storageKey}`);

			return {
				success: true,
				message: 'Storage key updated successfully'
			};
		} catch (error) {
			console.error(`Failed to update animation storage key:`, error);
			return {
				success: false,
				message: `Failed to update storage key: ${error instanceof Error ? error.message : String(error)}`
			};
		}
	}

	/**
	 * Mark animation as completed
	 */
	async markAnimationCompleted(id: number): Promise<{ success: boolean; message: string; queue_entry_id?: number; status?: string }> {
		try {
			// First, get the animation entry to validate it exists and check current status
			const animationEntry = await this.db
				.select({
					id: gifCreationQueue.id,
					status: gifCreationQueue.status,
					referenceId: gifCreationQueue.referenceId,
				})
				.from(gifCreationQueue)
				.where(eq(gifCreationQueue.id, id))
				.limit(1);

			if (!animationEntry[0]) {
				return {
					success: false,
					message: `Animation queue entry with ID ${id} not found`
				};
			}

			const entry = animationEntry[0];

			// Validate that the animation is in pending status
			if (entry.status !== 'pending') {
				return {
					success: false,
					message: `Animation is not in pending status. Current status: ${entry.status}`
				};
			}

			// Update the animation status to completed
			const processedAt = new Date().toISOString();
			await this.db
				.update(gifCreationQueue)
				.set({
					status: 'completed',
					processedAt,
				})
				.where(eq(gifCreationQueue.id, id));

			console.log(`Marked animation as completed: ID ${id}, Reference: ${entry.referenceId}`);

			return {
				success: true,
				message: 'Animation marked as completed successfully',
				queue_entry_id: id,
				status: 'completed'
			};
		} catch (error) {
			console.error(`Failed to mark animation as completed:`, error);
			return {
				success: false,
				message: `Failed to mark animation as completed: ${error instanceof Error ? error.message : String(error)}`
			};
		}
	}


	async deleteAnimation(id: number): Promise<{ success: boolean, message: string }> {
		try {
			await this.db.delete(gifCreationQueue)
				.where(eq(gifCreationQueue.id, id));
			return {
				success: true,
				message: 'Animation deleted successfully'
			}
		} catch (error) {
			console.error(`Failed to delete animation from database:`, error);
			return {
				success: false,
				message: `Failed to delete animation from database: ${error instanceof Error ? error.message : String(error)}`
			};
		}
	}

	toInsert(x: AnimationQueueEntry): NewAnimationQueueEntry {
		return {
			webcamId: x.webcam_id,
			referenceId: x.reference_id,
			gifType: x.gif_type,
			scheduledTime: x.scheduled_time,
			dateKey: x.date_key,
			imageList: x.image_list,
			status: x.status,
			createdAt: x.created_at,
			processedAt: x.processed_at,
			errorMessage: x.error_message,
			startTime: x.start_time,
			endTime: x.end_time,
			gifStorageKey: x.gif_storage_key
		}
	}
}
