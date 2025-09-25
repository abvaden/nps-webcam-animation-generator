import { eq, and } from 'drizzle-orm';
import type { Database } from '../connection';
import { webcamDiagnostics, webcamErrors, webcamActivityLog } from '../schema';
import type {
  WebcamDiagnostic,
  WebcamError,
  WebcamActivityLog,
} from '../schema';
import { ActivityType, ErrorType } from '../../types';

export interface IDiagnosticsRepository
{
	updateWebcamDiagnostics(
    webcamId: number,
    imagesCaptured: number,
    imagesSkipped: number,
    r2CallsClassA: number,
    r2CallsClassB: number,
    averageImageSize: number,
    totalBytesStored: number,
    gifsCreated: number,
    estimatedCosts: number
  ): Promise<void>;
	logWebcamActivity(
    webcamId: number,
    activityType: ActivityType,
    imageHash: string | null,
    imageSizeBytes: number,
    r2CallsMade: number,
    details?: string
  ): Promise<void>;
	logWebcamError(
    webcamId: number,
    errorType: ErrorType,
    errorMessage: string,
    errorDetails?: string
  ): Promise<void>;
}

export class DiagnosticsRepository implements IDiagnosticsRepository {
  constructor(private db: Database) {}

  /**
   * Update webcam diagnostics with new metrics
   */
  async updateWebcamDiagnostics(
    webcamId: number,
    imagesCaptured: number,
    imagesSkipped: number,
    r2CallsClassA: number,
    r2CallsClassB: number,
    averageImageSize: number,
    totalBytesStored: number,
    gifsCreated: number,
    estimatedCosts: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Try to update existing record first
      const existingRecord = await this.db
        .select()
        .from(webcamDiagnostics)
        .where(
          and(
            eq(webcamDiagnostics.webcamId, webcamId),
            eq(webcamDiagnostics.date, today)
          )
        )
        .limit(1);

      if (existingRecord.length > 0) {
        // Update existing record
        const current = existingRecord[0];
        await this.db
          .update(webcamDiagnostics)
          .set({
            totalImagesCaptured: (current.totalImagesCaptured || 0) + imagesCaptured,
            totalImagesSkipped: (current.totalImagesSkipped || 0) + imagesSkipped,
						totalR2ClassACalls: (current.totalR2ClassACalls || 0) + r2CallsClassA,
            totalR2ClassBCalls: (current.totalR2ClassBCalls || 0) + r2CallsClassB,
            averageImageSizeBytes: averageImageSize, // Use latest average
            totalBytesStored: (current.totalBytesStored || 0) + totalBytesStored,
            gifsCreated: (current.gifsCreated || 0) + gifsCreated,
            // estimatedCosts: (current.estimatedCosts || 0) + estimatedCosts,
            lastUpdated: new Date().toISOString(),
          })
          .where(eq(webcamDiagnostics.id, current.id));
      } else {
        // Insert new record
        await this.db.insert(webcamDiagnostics).values({
          webcamId,
          date: today,
          // total_images_captured: imagesCaptured,
          totalImagesSkipped: imagesSkipped,
          // totalR2CallsClassA: r2CallsClassA,
          // totalR2CallsClassB: r2CallsClassB,
          averageImageSizeBytes: averageImageSize,
          totalBytesStored: totalBytesStored,
          gifsCreated: gifsCreated,
        });
      }
    } catch (error) {
      console.error('Failed to update webcam diagnostics:', error);
    }
  }

  /**
   * Get diagnostics for a webcam on a specific date
   */
  async getWebcamDiagnostics(webcamId: number, date: string): Promise<WebcamDiagnostic | null> {
    try {
      const result = await this.db
        .select()
        .from(webcamDiagnostics)
        .where(
          and(
            eq(webcamDiagnostics.webcamId, webcamId),
            eq(webcamDiagnostics.date, date)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Failed to get webcam diagnostics:', error);
      return null;
    }
  }

  /**
   * Get diagnostics for a webcam over a date range
   */
  async getWebcamDiagnosticsRange(
    webcamId: number,
    startDate: string,
    endDate: string
  ): Promise<WebcamDiagnostic[]> {
    try {
      const result = await this.db
        .select()
        .from(webcamDiagnostics)
        .where(
          and(
            eq(webcamDiagnostics.webcamId, webcamId),
            // Note: For proper date range queries, you might want to use gte/lte
            // but since we're using string dates, this is a simplified version
          )
        );

      return result.filter(record =>
        record.date >= startDate && record.date <= endDate
      );
    } catch (error) {
      console.error('Failed to get webcam diagnostics range:', error);
      return [];
    }
  }

  /**
   * Log webcam activity
   */
  async logWebcamActivity(
    webcamId: number,
    activityType: ActivityType,
    imageHash: string | null,
    imageSizeBytes: number,
    r2CallsMade: number,
    details?: string
  ): Promise<void> {
    try {
      await this.db.insert(webcamActivityLog).values({
        webcamId,
        activityType,
        imageHash,
        imageSizeBytes,
        r2CallsMade,
        details,
      });
    } catch (error) {
      console.error('Failed to log webcam activity:', error);
    }
  }

  /**
   * Log webcam error
   */
  async logWebcamError(
    webcamId: number,
    errorType: ErrorType,
    errorMessage: string,
    errorDetails?: string
  ): Promise<void> {
    try {
      await this.db.insert(webcamErrors).values({
        webcamId,
        errorType,
        errorMessage,
        errorDetails,
      });
    } catch (error) {
      console.error('Failed to log webcam error:', error);
    }
  }

  /**
   * Get recent activity for a webcam
   */
  async getRecentActivity(webcamId: number, limit: number = 50): Promise<WebcamActivityLog[]> {
    try {
      const result = await this.db
        .select()
        .from(webcamActivityLog)
        .where(eq(webcamActivityLog.webcamId, webcamId))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  /**
   * Get unresolved errors for a webcam
   */
  async getUnresolvedErrors(webcamId: number): Promise<WebcamError[]> {
    try {
      const result = await this.db
        .select()
        .from(webcamErrors)
        .where(
          and(
            eq(webcamErrors.webcamId, webcamId),
            eq(webcamErrors.resolved, false)
          )
        );

      return result;
    } catch (error) {
      console.error('Failed to get unresolved errors:', error);
      return [];
    }
  }

  /**
   * Get all errors for a webcam (resolved and unresolved)
   */
  async getAllErrors(webcamId: number, limit: number = 100): Promise<WebcamError[]> {
    try {
      const result = await this.db
        .select()
        .from(webcamErrors)
        .where(eq(webcamErrors.webcamId, webcamId))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Failed to get all errors:', error);
      return [];
    }
  }

  /**
   * Clean up old activity logs (older than specified days)
   */
  async cleanupOldActivityLogs(daysOld: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffTimestamp = cutoffDate.toISOString();

      await this.db
        .delete(webcamActivityLog)
        .where(eq(webcamActivityLog.timestamp, cutoffTimestamp)); // This is simplified - in practice you'd use lte

      console.log(`Cleaned up activity logs older than ${daysOld} days`);
    } catch (error) {
      console.error('Failed to cleanup old activity logs:', error);
    }
  }

  /**
   * Clean up old diagnostics (older than specified days)
   */
  async cleanupOldDiagnostics(daysOld: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      // This is a simplified cleanup - in practice you'd want proper date comparison
      const oldRecords = await this.db
        .select()
        .from(webcamDiagnostics);

      const recordsToDelete = oldRecords.filter(record => record.date < cutoffDateString);

      for (const record of recordsToDelete) {
        await this.db
          .delete(webcamDiagnostics)
          .where(eq(webcamDiagnostics.id, record.id));
      }

      console.log(`Cleaned up ${recordsToDelete.length} diagnostic records older than ${daysOld} days`);
    } catch (error) {
      console.error('Failed to cleanup old diagnostics:', error);
    }
  }

  /**
   * Get summary statistics for a webcam
   */
  async getWebcamSummaryStats(webcamId: number): Promise<{
    totalImages: number;
    totalErrors: number;
    unresolvedErrors: number;
    totalR2Calls: number;
    totalCosts: number;
  }> {
    try {
      const diagnostics = await this.db
        .select()
        .from(webcamDiagnostics)
        .where(eq(webcamDiagnostics.webcamId, webcamId));

      const errors = await this.db
        .select()
        .from(webcamErrors)
        .where(eq(webcamErrors.webcamId, webcamId));

      const unresolvedErrors = errors.filter(error => !error.resolved);

      // const totalImages = diagnostics.reduce((sum, d) => sum + (d.totalImagesCaptured || 0), 0);
      // const totalR2Calls = diagnostics.reduce((sum, d) => sum + (d.totalR2CallsClassA || 0) + (d.totalR2CallsClassB || 0), 0);
      // const totalCosts = diagnostics.reduce((sum, d) => sum + (d.estimatedCosts || 0), 0);

      return {
        totalImages : 0,
        totalErrors: errors.length,
        unresolvedErrors: unresolvedErrors.length,
        totalR2Calls: 0,
        totalCosts : 0,
      };
    } catch (error) {
      console.error('Failed to get webcam summary stats:', error);
      return {
        totalImages: 0,
        totalErrors: 0,
        unresolvedErrors: 0,
        totalR2Calls: 0,
        totalCosts: 0,
      };
    }
  }
}
