import { eq, and, gte, lte, asc, or } from 'drizzle-orm';
import type { Database } from '../connection';
import { images, webcams } from '../schema';
import type { Image, WebcamDto } from '../schema';

export interface IImageRepository {
  addImageToDatabase(webcamId: number, timestamp: number, objectName: string): Promise<boolean>;
  getAllImagesForTimeRangeWoRetentionPolicy(startTime: number, endTime: number): Promise<Image[]>;
	getImagesForTimeRange(webcam: WebcamDto, startTime: number, endTime: number): Promise<Image[]>;
  getImageById(imageId: number): Promise<Image | null>;
  getImagesByWebcamId(webcamId: number, limit?: number, offset?: number): Promise<Image[]>;
  getLatestImageForWebcam(webcamId: number): Promise<Image | null>;
  deleteOldImages(daysOld: number): Promise<number>;
  getImageCountForWebcam(webcamId: number): Promise<number>;
  getImagesInDateRange(startDate: Date, endDate: Date, webcamId?: number): Promise<Image[]>;
  deleteImage(imageId: number): Promise<boolean>;
  updateImageObjectName(imageId: number, newObjectName: string): Promise<boolean>;
  putImage(image: Image): Promise<boolean>;
}

export class ImageRepository implements IImageRepository {
  constructor(private db: Database) {}

  /**
   * Add image to database
   */
  async addImageToDatabase(webcamId: number, timestamp: number, objectName: string): Promise<boolean> {
    try {
      await this.db.insert(images).values({
        webcamId,
        timeStamp: timestamp,
        objectName,
      });

      return true;
    } catch (error) {
      console.error('Failed to add image to database:', error);
      return false;
    }
  }

  /**
   * Get images for a specific time range from the database
   */
  async getImagesForTimeRange(
    webcam: WebcamDto,
    startTime: number,
    endTime: number
  ): Promise<Image[]> {
    try {
      // Convert millisecond timestamps to seconds for database query
      const startTimeSeconds = Math.floor(startTime);
      const endTimeSeconds = Math.floor(endTime);

      const result = await this.db
        .select()
        .from(images)
        .where(
          and(
            eq(images.webcamId, webcam.id),
            gte(images.timeStamp, startTimeSeconds),
            lte(images.timeStamp, endTimeSeconds)
          )
        )
        .orderBy(asc(images.timeStamp));

      return result;
    } catch (error) {
      console.error('Failed to get images for time range:', error);
      return [];
    }
  }

  /**
   * Get image by ID
   */
  async getImageById(imageId: number): Promise<Image | null> {
    try {
      const result = await this.db
        .select()
        .from(images)
        .where(eq(images.id, imageId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Failed to get image by ID:', error);
      return null;
    }
  }

  /**
   * Get images by webcam ID with pagination
   */
  async getImagesByWebcamId(
    webcamId: number,
    limit: number = 100,
    offset: number = 0
  ): Promise<Image[]> {
    try {
      const result = await this.db
        .select()
        .from(images)
        .where(eq(images.webcamId, webcamId))
        .orderBy(asc(images.timeStamp))
        .limit(limit)
        .offset(offset);

      return result;
    } catch (error) {
      console.error('Failed to get images by webcam ID:', error);
      return [];
    }
  }

  /**
   * Get latest image for a webcam
   */
  async getLatestImageForWebcam(webcamId: number): Promise<Image | null> {
    try {
      const result = await this.db
        .select()
        .from(images)
        .where(eq(images.webcamId, webcamId))
        .orderBy(asc(images.timeStamp))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Failed to get latest image for webcam:', error);
      return null;
    }
  }

  /**
   * Delete old images (older than specified days)
   */
  async deleteOldImages(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const result = await this.db
        .delete(images)
        .where(lte(images.timeStamp, cutoffTimestamp));

      console.log(`Deleted old images older than ${daysOld} days`);
      return 0; // D1 doesn't return affected rows count reliably
    } catch (error) {
      console.error('Failed to delete old images:', error);
      return 0;
    }
  }

  /**
   * Get image count for a webcam
   */
  async getImageCountForWebcam(webcamId: number): Promise<number> {
    try {
      const result = await this.db
        .select({ count: images.id })
        .from(images)
        .where(eq(images.webcamId, webcamId));

      return result.length;
    } catch (error) {
      console.error('Failed to get image count for webcam:', error);
      return 0;
    }
  }

  /**
   * Get images within a date range (for bulk operations)
   */
  async getImagesInDateRange(
    startDate: Date,
    endDate: Date,
    webcamId?: number
  ): Promise<Image[]> {
    try {
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      const whereConditions = [
        gte(images.timeStamp, startTimestamp),
        lte(images.timeStamp, endTimestamp)
      ];

      if (webcamId) {
        whereConditions.push(eq(images.webcamId, webcamId));
      }

      const result = await this.db
        .select()
        .from(images)
        .where(and(...whereConditions))
        .orderBy(asc(images.timeStamp));

      return result;
    } catch (error) {
      console.error('Failed to get images in date range:', error);
      return [];
    }
  }

  /**
   * Delete image by ID
   */
  async deleteImage(imageId: number): Promise<boolean> {
    try {
      await this.db
        .delete(images)
        .where(eq(images.id, imageId));

      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Update image object name (if needed for migrations or corrections)
   */
  async updateImageObjectName(imageId: number, newObjectName: string): Promise<boolean> {
    try {
      await this.db
        .update(images)
        .set({ objectName: newObjectName })
        .where(eq(images.id, imageId));

      return true;
    } catch (error) {
      console.error('Failed to update image object name:', error);
      return false;
    }
  }

  async putImage(image: Image): Promise<boolean> {
    try {
      await this.db
        .update(images)
        .set(image)
        .where(eq(images.id, image.id));

      return true;
    } catch (error) {
      console.error('Failed to update image :', error);
      return false;
    }
  }

	async getAllImagesForTimeRangeWoRetentionPolicy(startTime: number, endTime: number): Promise<Image[]> {
		try {
      const result = await this.db
        .select()
				.from(images)
				.where(and(
            or(eq(images.retentionPolicy, null), eq(images.retentionPolicy, [])),
            gte(images.timeStamp, startTime),
            lte(images.timeStamp, endTime)
          ));

      return result;
    } catch (error) {
      console.error('Failed to find images :', error);
      return [];
    }
	}
}
