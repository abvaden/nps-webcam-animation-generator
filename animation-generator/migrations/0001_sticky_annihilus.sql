PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_webcams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`enabled` integer DEFAULT true,
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
INSERT INTO `__new_webcams`("id", "name", "url", "enabled", "interval_minutes", "location", "national_park", "timezone", "last_image_hash", "last_active_at", "created_at", "updated_at", "lat_lon", "display_name") SELECT "id", "name", "url", "enabled", "interval_minutes", "location", "national_park", "timezone", "last_image_hash", "last_active_at", "created_at", "updated_at", "lat_lon", "display_name" FROM `webcams`;--> statement-breakpoint
DROP TABLE `webcams`;--> statement-breakpoint
ALTER TABLE `__new_webcams` RENAME TO `webcams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_webcams_enabled` ON `webcams` (`enabled`);--> statement-breakpoint
CREATE TABLE `__new_webcam_diagnostics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	`estimated_class_a_cost_usd` numeric,
	`estimated_class_b_cost_usd` numeric,
	`estimated_total_r2_cost_usd` numeric,
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_webcam_diagnostics`("id", "webcam_id", "date", "total_images_captured", "total_images_skipped", "total_r2_calls", "average_image_size_bytes", "total_bytes_stored", "gifs_created", "last_updated", "total_r2_class_a_calls", "total_r2_class_b_calls", "estimated_class_a_cost_usd", "estimated_class_b_cost_usd", "estimated_total_r2_cost_usd") SELECT "id", "webcam_id", "date", "total_images_captured", "total_images_skipped", "total_r2_calls", "average_image_size_bytes", "total_bytes_stored", "gifs_created", "last_updated", "total_r2_class_a_calls", "total_r2_class_b_calls", "estimated_class_a_cost_usd", "estimated_class_b_cost_usd", "estimated_total_r2_cost_usd" FROM `webcam_diagnostics`;--> statement-breakpoint
DROP TABLE `webcam_diagnostics`;--> statement-breakpoint
ALTER TABLE `__new_webcam_diagnostics` RENAME TO `webcam_diagnostics`;--> statement-breakpoint
CREATE INDEX `idx_webcam_diagnostics_date` ON `webcam_diagnostics` (`webcam_id`,`date`);--> statement-breakpoint
CREATE TABLE `__new_webcam_errors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`webcam_id` integer NOT NULL,
	`error_type` text NOT NULL,
	`error_message` text NOT NULL,
	`error_details` text,
	`occurred_at` numeric DEFAULT (CURRENT_TIMESTAMP),
	`resolved` integer DEFAULT false,
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_webcam_errors`("id", "webcam_id", "error_type", "error_message", "error_details", "occurred_at", "resolved") SELECT "id", "webcam_id", "error_type", "error_message", "error_details", "occurred_at", "resolved" FROM `webcam_errors`;--> statement-breakpoint
DROP TABLE `webcam_errors`;--> statement-breakpoint
ALTER TABLE `__new_webcam_errors` RENAME TO `webcam_errors`;--> statement-breakpoint
CREATE INDEX `idx_webcam_errors_webcam_resolved` ON `webcam_errors` (`webcam_id`,`resolved`);--> statement-breakpoint
CREATE TABLE `__new_webcam_activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
INSERT INTO `__new_webcam_activity_log`("id", "webcam_id", "activity_type", "image_hash", "image_size_bytes", "r2_calls_made", "details", "timestamp") SELECT "id", "webcam_id", "activity_type", "image_hash", "image_size_bytes", "r2_calls_made", "details", "timestamp" FROM `webcam_activity_log`;--> statement-breakpoint
DROP TABLE `webcam_activity_log`;--> statement-breakpoint
ALTER TABLE `__new_webcam_activity_log` RENAME TO `webcam_activity_log`;--> statement-breakpoint
CREATE INDEX `idx_webcam_activity_webcam_timestamp` ON `webcam_activity_log` (`webcam_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `__new_gif_creation_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
INSERT INTO `__new_gif_creation_queue`("id", "webcam_id", "reference_id", "gif_type", "scheduled_time", "image_list", "status", "created_at", "processed_at", "error_message", "start_time", "end_time", "gif_storage_key", "date_key") SELECT "id", "webcam_id", "reference_id", "gif_type", "scheduled_time", "image_list", "status", "created_at", "processed_at", "error_message", "start_time", "end_time", "gif_storage_key", "date_key" FROM `gif_creation_queue`;--> statement-breakpoint
DROP TABLE `gif_creation_queue`;--> statement-breakpoint
ALTER TABLE `__new_gif_creation_queue` RENAME TO `gif_creation_queue`;--> statement-breakpoint
CREATE INDEX `idx_gif_queue_status_date` ON `gif_creation_queue` (`status`,`date_key`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_date_key` ON `gif_creation_queue` (`date_key`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_storage_key` ON `gif_creation_queue` (`gif_storage_key`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_reference` ON `gif_creation_queue` (`reference_id`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_webcam` ON `gif_creation_queue` (`webcam_id`);--> statement-breakpoint
CREATE INDEX `idx_gif_queue_status_time` ON `gif_creation_queue` (`status`,`scheduled_time`);--> statement-breakpoint
CREATE TABLE `__new_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`webcam_id` integer NOT NULL,
	`time_stamp` integer NOT NULL,
	`object_name` text NOT NULL,
	`retention_policy` text,
	`retention_policy_settings` text,
	FOREIGN KEY (`webcam_id`) REFERENCES `webcams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_images`("id", "webcam_id", "time_stamp", "object_name", "retention_policy", "retention_policy_settings") SELECT "id", "webcam_id", "time_stamp", "object_name", "retention_policy", "retention_policy_settings" FROM `images`;--> statement-breakpoint
DROP TABLE `images`;--> statement-breakpoint
ALTER TABLE `__new_images` RENAME TO `images`;--> statement-breakpoint
CREATE TABLE `__new_d1_migrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`applied_at` numeric DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_d1_migrations`("id", "name", "applied_at") SELECT "id", "name", "applied_at" FROM `d1_migrations`;--> statement-breakpoint
DROP TABLE `d1_migrations`;--> statement-breakpoint
ALTER TABLE `__new_d1_migrations` RENAME TO `d1_migrations`;