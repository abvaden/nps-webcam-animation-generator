import { eq } from 'drizzle-orm';
import type { Database } from '../connection';
import { webcams } from '../schema';
import type { WebcamDto } from '../schema';

export interface IWebcamRepository {
	getEnabledWebcams(): Promise<WebcamDto[]>;
	getWebcamById(webcamId: number): Promise<WebcamDto | null>;
	getWebcamTimezone(webcamId: number): Promise<string | null>;
	updateWebcamStatus(webcamId: number, imageHash: string): Promise<void>;
	createWebcam(webcam: WebcamDto): Promise<WebcamDto>;
	deleteWebcam(webcamId: number): Promise<boolean>;
	updateWebcam(webcamId: number, updates: Partial<WebcamDto>): Promise<WebcamDto | null>;
	deleteWebcam(webcamId: number): Promise<boolean>;
	getAllWebcams(): Promise<WebcamDto[]>;
}

export class WebcamRepository implements IWebcamRepository {
  constructor(private db: Database) {}

  /**
   * Get all enabled webcams
   */
  async getEnabledWebcams(): Promise<WebcamDto[]> {
    try {
      const result = await this.db
        .select()
        .from(webcams)
        .where(eq(webcams.enabled, true))
        .orderBy(webcams.name);

      return result;
    } catch (error) {
      console.error("Failed to fetch enabled webcams:", error);
      return [];
    }
  }

  /**
   * Get webcam by ID
   */
  async getWebcamById(webcamId: number): Promise<WebcamDto | null> {
    try {
      const result = await this.db
        .select()
        .from(webcams)
        .where(eq(webcams.id, webcamId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Failed to fetch webcam by ID:", error);
      return null;
    }
  }

  /**
   * Get webcam timezone by ID (optimized query for just timezone)
   */
  async getWebcamTimezone(webcamId: number): Promise<string | null> {
    try {
      const result = await this.db
        .select({ timezone: webcams.timezone })
        .from(webcams)
        .where(eq(webcams.id, webcamId))
        .limit(1);

      return result[0]?.timezone || null;
    } catch (error) {
      console.error("Failed to fetch webcam timezone:", error);
      return null;
    }
  }

  /**
   * Update webcam status with new image hash and last active timestamp
   */
  async updateWebcamStatus(webcamId: number, imageHash: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.db
        .update(webcams)
        .set({
          lastImageHash: imageHash,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(webcams.id, webcamId));
    } catch (error) {
      console.error("Failed to update webcam status:", error);
      throw error;
    }
  }

  /**
   * Create a new webcam
   */
  async createWebcam(webcam: WebcamDto): Promise<WebcamDto> {
    try {
      const result = await this.db
        .insert(webcams)
        .values(webcam)
        .returning();

      return result[0];
    } catch (error) {
      console.error("Failed to create webcam:", error);
      throw error;
    }
  }

  /**
   * Update webcam
   */
  async updateWebcam(webcamId: number, updates: Partial<WebcamDto>): Promise<WebcamDto | null> {
    try {
      const result = await this.db
        .update(webcams)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(webcams.id, webcamId))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error("Failed to update webcam:", error);
      throw error;
    }
  }

  /**
   * Delete webcam
   */
  async deleteWebcam(webcamId: number): Promise<boolean> {
    try {
      await this.db
        .delete(webcams)
        .where(eq(webcams.id, webcamId));

      return true;
    } catch (error) {
      console.error("Failed to delete webcam:", error);
      return false;
    }
  }

  /**
   * Get all webcams (including disabled ones)
   */
  async getAllWebcams(): Promise<WebcamDto[]> {
    try {
      const result = await this.db
        .select()
        .from(webcams)
        .orderBy(webcams.name);

      return result;
    } catch (error) {
      console.error("Failed to fetch all webcams:", error);
      return [];
    }
  }
}
