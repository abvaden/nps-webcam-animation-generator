-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations


CREATE TABLE `webcams_2` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`enabled` numeric DEFAULT (TRUE),
	`interval_minutes` integer DEFAULT 1,
	`location` text,
	`national_park` text,
	`timezone` text DEFAULT 'America/Denver',
	`last_image_hash` text,
	`last_active_at` numeric,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`lat_lon` text,
	`display_name` text
);

/*
CREATE TABLE `webcams` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`enabled` numeric DEFAULT (TRUE),
	`interval_minutes` integer DEFAULT 1,
	`location` text,
	`national_park` text,
	`timezone` text DEFAULT 'America/Denver',
	`last_image_hash` text,
	`last_active_at` numeric,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`lat_lon` text,
	`display_name` text
);
--> statement-breakpoint
CREATE INDEX `idx_webcams_enabled` ON `webcams` (`enabled`);--> statement-breakpoint
CREATE TABLE `webcam_diagnostics` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`webcam_id` integer NOT NULL,
	`date` numeric NOT NULL,
	`total_images_captured` integer DEFAULT 0,
	`total_images_skipped` integer DEFAULT 0,
	`total_r2_calls` integer DEFAULT 0,
	`average_image_size_bytes` integer DEFAULT 0,
	`total_bytes_stored` integer DEFAULT 0,
	`gifs_created` integer DEFAULT 0,
	`last_updated` numeric DEFAULT (CURRENT_TIMESTAMP),
	`total_r2_class_a_calls` integer DEFAULT 0,
	`total_r2_class_b_calls` integer DEFAULT 0,
	`estimated_class_a_cost_usd` numeric DEFAULT 0,
	`estimated_class_b_cost_usd` numeric DEFAULT 0,
	`estimated_total_r2_cost_usd` numeric DEFAULT 0,
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_webcam_diagnostics_date` ON `webcam_diagnostics` (`webcam_id`,`date`);--> statement-breakpoint
CREATE TABLE `webcam_errors` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`webcam_id` integer NOT NULL,
	`error_type` text NOT NULL,
	`error_message` text NOT NULL,
	`error_details` text,
	`occurred_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`resolved` numeric DEFAULT (FALSE),
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_webcam_errors_webcam_resolved` ON `webcam_errors` (`webcam_id`,`resolved`);--> statement-breakpoint
CREATE TABLE `webcam_activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`webcam_id` integer NOT NULL,
	`activity_type` text NOT NULL,
	`image_hash` text,
	`image_size_bytes` integer,
	`r2_calls_made` integer DEFAULT 0,
	`details` text,
	`timestamp` numeric DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_webcam_activity_webcam_timestamp` ON `webcam_activity_log` (`webcam_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `gif_creation_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`webcam_id` integer NOT NULL,
	`reference_id` text NOT NULL,
	`gif_type` text NOT NULL,
	`scheduled_time` numeric NOT NULL,
	`image_list` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`processed_at` numeric,
	`error_message` text,
	`start_time` integer DEFAULT 0,
	`end_time` integer DEFAULT 0,
	`gif_storage_key` text,
	`date_key` text,
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_gif_queue_status_date` ON `gif_creation_queue` (`status`,`date_key`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_date_key` ON `gif_creation_queue` (`date_key`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_storage_key` ON `gif_creation_queue` (`gif_storage_key`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_reference` ON `gif_creation_queue` (`reference_id`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_webcam` ON `gif_creation_queue` (`webcam_id`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_status_time` ON `gif_creation_queue` (`status`,`scheduled_time`);--> statement-breakpoint
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`webcam_id` integer NOT NULL,
	`time_stamp` integer NOT NULL,
	`object_name` text NOT NULL,
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `d1_migrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text,
	`applied_at` numeric DEFAULT (current_timestamp) NOT NULL
);

*/

