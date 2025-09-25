// Cost monitoring and reporting utilities for R2 call classification

import type { Env } from '../types/index.js';
import type { R2CallMetrics } from './r2-tracker';

export interface CostReport {
  webcamId: number;
  webcamName: string;
  date: string;
  classACalls: number;
  classBCalls: number;
  totalCalls: number;
  classACostUSD: number;
  classBCostUSD: number;
  totalCostUSD: number;
  imagesCaptured: number;
  imagesSkipped: number;
  gifsCreated: number;
  totalBytesStored: number;
}

export interface DailyCostSummary {
  date: string;
  totalWebcams: number;
  totalClassACalls: number;
  totalClassBCalls: number;
  totalCalls: number;
  totalClassACostUSD: number;
  totalClassBCostUSD: number;
  totalCostUSD: number;
  totalImagesProcessed: number;
  totalGifsCreated: number;
  totalBytesStored: number;
  averageCostPerWebcam: number;
  averageCostPerImage: number;
}

/**
 * Retrieves cost report for a specific webcam and date
 */
export async function getWebcamCostReport(
  env: Env,
  webcamId: number,
  date: string
): Promise<CostReport | null> {
  try {
    const result = await env.WEBCAM_DB.prepare(`
      SELECT
        wd.webcam_id,
        w.name as webcam_name,
        wd.date,
        wd.total_r2_class_a_calls as class_a_calls,
        wd.total_r2_class_b_calls as class_b_calls,
        wd.total_r2_calls as total_calls,
        wd.estimated_class_a_cost_usd as class_a_cost_usd,
        wd.estimated_class_b_cost_usd as class_b_cost_usd,
        wd.estimated_total_r2_cost_usd as total_cost_usd,
        wd.total_images_captured as images_captured,
        wd.total_images_skipped as images_skipped,
        wd.gifs_created,
        wd.total_bytes_stored
      FROM webcam_diagnostics wd
      JOIN webcams w ON wd.webcam_id = w.id
      WHERE wd.webcam_id = ? AND wd.date = ?
    `).bind(webcamId, date).first();

    if (!result) return null;

    return {
      webcamId: result.webcam_id as number,
      webcamName: result.webcam_name as string,
      date: result.date as string,
      classACalls: result.class_a_calls as number,
      classBCalls: result.class_b_calls as number,
      totalCalls: result.total_calls as number,
      classACostUSD: result.class_a_cost_usd as number,
      classBCostUSD: result.class_b_cost_usd as number,
      totalCostUSD: result.total_cost_usd as number,
      imagesCaptured: result.images_captured as number,
      imagesSkipped: result.images_skipped as number,
      gifsCreated: result.gifs_created as number,
      totalBytesStored: result.total_bytes_stored as number,
    };
  } catch (error) {
    console.error("Failed to get webcam cost report:", error);
    return null;
  }
}

/**
 * Retrieves daily cost summary across all webcams
 */
export async function getDailyCostSummary(env: Env, date: string): Promise<DailyCostSummary | null> {
  try {
    const result = await env.WEBCAM_DB.prepare(`
      SELECT
        ? as date,
        COUNT(DISTINCT webcam_id) as total_webcams,
        SUM(total_r2_class_a_calls) as total_class_a_calls,
        SUM(total_r2_class_b_calls) as total_class_b_calls,
        SUM(total_r2_calls) as total_calls,
        SUM(estimated_class_a_cost_usd) as total_class_a_cost_usd,
        SUM(estimated_class_b_cost_usd) as total_class_b_cost_usd,
        SUM(estimated_total_r2_cost_usd) as total_cost_usd,
        SUM(total_images_captured + total_images_skipped) as total_images_processed,
        SUM(gifs_created) as total_gifs_created,
        SUM(total_bytes_stored) as total_bytes_stored
      FROM webcam_diagnostics
      WHERE date = ?
    `).bind(date, date).first();

    if (!result || result.total_webcams === 0) return null;

    const totalWebcams = result.total_webcams as number;
    const totalImagesProcessed = result.total_images_processed as number;
    const totalCostUSD = result.total_cost_usd as number;

    return {
      date,
      totalWebcams,
      totalClassACalls: result.total_class_a_calls as number,
      totalClassBCalls: result.total_class_b_calls as number,
      totalCalls: result.total_calls as number,
      totalClassACostUSD: result.total_class_a_cost_usd as number,
      totalClassBCostUSD: result.total_class_b_cost_usd as number,
      totalCostUSD,
      totalImagesProcessed,
      totalGifsCreated: result.total_gifs_created as number,
      totalBytesStored: result.total_bytes_stored as number,
      averageCostPerWebcam: totalWebcams > 0 ? totalCostUSD / totalWebcams : 0,
      averageCostPerImage: totalImagesProcessed > 0 ? totalCostUSD / totalImagesProcessed : 0,
    };
  } catch (error) {
    console.error("Failed to get daily cost summary:", error);
    return null;
  }
}

/**
 * Retrieves cost trends over a date range
 */
export async function getCostTrends(
  env: Env,
  startDate: string,
  endDate: string
): Promise<DailyCostSummary[]> {
  try {
    const results = await env.WEBCAM_DB.prepare(`
      SELECT
        date,
        COUNT(DISTINCT webcam_id) as total_webcams,
        SUM(total_r2_class_a_calls) as total_class_a_calls,
        SUM(total_r2_class_b_calls) as total_class_b_calls,
        SUM(total_r2_calls) as total_calls,
        SUM(estimated_class_a_cost_usd) as total_class_a_cost_usd,
        SUM(estimated_class_b_cost_usd) as total_class_b_cost_usd,
        SUM(estimated_total_r2_cost_usd) as total_cost_usd,
        SUM(total_images_captured + total_images_skipped) as total_images_processed,
        SUM(gifs_created) as total_gifs_created,
        SUM(total_bytes_stored) as total_bytes_stored
      FROM webcam_diagnostics
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).bind(startDate, endDate).all();

    return results.results.map(result => {
      const totalWebcams = result.total_webcams as number;
      const totalImagesProcessed = result.total_images_processed as number;
      const totalCostUSD = result.total_cost_usd as number;

      return {
        date: result.date as string,
        totalWebcams,
        totalClassACalls: result.total_class_a_calls as number,
        totalClassBCalls: result.total_class_b_calls as number,
        totalCalls: result.total_calls as number,
        totalClassACostUSD: result.total_class_a_cost_usd as number,
        totalClassBCostUSD: result.total_class_b_cost_usd as number,
        totalCostUSD,
        totalImagesProcessed,
        totalGifsCreated: result.total_gifs_created as number,
        totalBytesStored: result.total_bytes_stored as number,
        averageCostPerWebcam: totalWebcams > 0 ? totalCostUSD / totalWebcams : 0,
        averageCostPerImage: totalImagesProcessed > 0 ? totalCostUSD / totalImagesProcessed : 0,
      };
    });
  } catch (error) {
    console.error("Failed to get cost trends:", error);
    return [];
  }
}

/**
 * Identifies webcams with highest R2 costs
 */
export async function getTopCostWebcams(
  env: Env,
  date: string,
  limit: number = 10
): Promise<CostReport[]> {
  try {
    const results = await env.WEBCAM_DB.prepare(`
      SELECT
        wd.webcam_id,
        w.name as webcam_name,
        wd.date,
        wd.total_r2_class_a_calls as class_a_calls,
        wd.total_r2_class_b_calls as class_b_calls,
        wd.total_r2_calls as total_calls,
        wd.estimated_class_a_cost_usd as class_a_cost_usd,
        wd.estimated_class_b_cost_usd as class_b_cost_usd,
        wd.estimated_total_r2_cost_usd as total_cost_usd,
        wd.total_images_captured as images_captured,
        wd.total_images_skipped as images_skipped,
        wd.gifs_created,
        wd.total_bytes_stored
      FROM webcam_diagnostics wd
      JOIN webcams w ON wd.webcam_id = w.id
      WHERE wd.date = ?
      ORDER BY wd.estimated_total_r2_cost_usd DESC
      LIMIT ?
    `).bind(date, limit).all();

    return results.results.map(result => ({
      webcamId: result.webcam_id as number,
      webcamName: result.webcam_name as string,
      date: result.date as string,
      classACalls: result.class_a_calls as number,
      classBCalls: result.class_b_calls as number,
      totalCalls: result.total_calls as number,
      classACostUSD: result.class_a_cost_usd as number,
      classBCostUSD: result.class_b_cost_usd as number,
      totalCostUSD: result.total_cost_usd as number,
      imagesCaptured: result.images_captured as number,
      imagesSkipped: result.images_skipped as number,
      gifsCreated: result.gifs_created as number,
      totalBytesStored: result.total_bytes_stored as number,
    }));
  } catch (error) {
    console.error("Failed to get top cost webcams:", error);
    return [];
  }
}
