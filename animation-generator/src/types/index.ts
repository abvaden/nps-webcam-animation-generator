// Environment interface for Cloudflare Worker
export interface Env {
  STORAGE_BUCKET: R2Bucket;
  WEBCAM_DB: D1Database;
  R2_PUBLIC_BASE_URL: string;
}
export interface Webcam {
	id: number;
	name: string;
	url: string;
	enabled: boolean;
	interval_minutes: number;
	display_name: string;
	lat_lon: string | null;
	national_park: string;
	timezone: string;
	last_image_hash: string | null;
	last_active_at: string | null;
}

// GIF queue entry interface
export interface AnimationQueueEntry {
	id: number;
	webcam_id: number;
	reference_id: string;
	gif_type: AnimationType;
	scheduled_time: string;
	date_key: string; // Local date in YYYY-MM-DD format based on webcam timezone
	image_list: string[]; // Array of image keys
	status: AnimationStatus;
	created_at: string;
	processed_at: string | null;
	error_message: string | null;
	start_time: number;
	end_time: number;
	gif_storage_key: string | null; // S3 key for uploaded GIF
}

// GIF types for queue entries
export type AnimationType = 'hourly' | 'sunrise' | 'sunset' | 'full_day';

// GIF processing status
export type AnimationStatus = 'waiting_for_images' | 'pending' | 'processing' | 'completed' | 'failed';


// Activity types for logging
export type ActivityType = 'image_captured' | 'image_skipped' | 'error';

// Error types for categorization
export type ErrorType = 'processing_error' | 'gif_error' | 'database_error' | 'network_error';
