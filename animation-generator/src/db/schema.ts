import { sqliteTable, AnySQLiteColumn, index, integer, text, numeric, foreignKey, blob } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const webcams = sqliteTable("webcams", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	url: text().notNull(),
	enabled: integer({ mode: 'boolean'}).default(true),
	intervalMinutes: integer("interval_minutes").default(1),
	location: text(),
	nationalPark: text("national_park"),
	timezone: text().default("America/Denver"),
	lastImageHash: text("last_image_hash"),
	lastActiveAt: numeric("last_active_at"),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
	latLon: text("lat_lon"),
	displayName: text("display_name"),
},
(table) => [
	index("idx_webcams_enabled").on(table.enabled),
]);

export const webcamDiagnostics = sqliteTable("webcam_diagnostics", {
	id: integer().primaryKey({ autoIncrement: true }),
	webcamId: integer("webcam_id").notNull().references(() => webcams.id),
	date: numeric().notNull(),
	totalImagesCaptured: integer("total_images_captured").default(0),
	totalImagesSkipped: integer("total_images_skipped").default(0),
	totalR2Calls: integer("total_r2_calls").default(0),
	averageImageSizeBytes: integer("average_image_size_bytes").default(0),
	totalBytesStored: integer("total_bytes_stored").default(0),
	gifsCreated: integer("gifs_created").default(0),
	lastUpdated: numeric("last_updated").default(sql`(CURRENT_TIMESTAMP)`),
	totalR2ClassACalls: integer("total_r2_class_a_calls").default(0),
	totalR2ClassBCalls: integer("total_r2_class_b_calls").default(0),
	estimatedClassACostUsd: numeric("estimated_class_a_cost_usd"),
	estimatedClassBCostUsd: numeric("estimated_class_b_cost_usd"),
	estimatedTotalR2CostUsd: numeric("estimated_total_r2_cost_usd"),
},
(table) => [
	index("idx_webcam_diagnostics_date").on(table.webcamId, table.date),
]);

export const webcamErrors = sqliteTable("webcam_errors", {
	id: integer().primaryKey({ autoIncrement: true }),
	webcamId: integer("webcam_id").notNull().references(() => webcams.id),
	errorType: text("error_type").notNull(),
	errorMessage: text("error_message").notNull(),
	errorDetails: text("error_details"),
	occurredAt: numeric("occurred_at").default(sql`(CURRENT_TIMESTAMP)`),
	resolved: integer({ mode: 'boolean'}).default(false),
},
(table) => [
	index("idx_webcam_errors_webcam_resolved").on(table.webcamId, table.resolved),
]);

export const webcamActivityLog = sqliteTable("webcam_activity_log", {
	id: integer().primaryKey({ autoIncrement: true }),
	webcamId: integer("webcam_id").notNull().references(() => webcams.id),
	activityType: text("activity_type").notNull(),
	imageHash: text("image_hash"),
	imageSizeBytes: integer("image_size_bytes"),
	r2CallsMade: integer("r2_calls_made").default(0),
	details: text(),
	timestamp: numeric().default(sql`(CURRENT_TIMESTAMP)`),
},
(table) => [
	index("idx_webcam_activity_webcam_timestamp").on(table.webcamId, table.timestamp),
]);

export const gifCreationQueue = sqliteTable("gif_creation_queue", {
	id: integer().primaryKey({ autoIncrement: true }),
	webcamId: integer("webcam_id").notNull().references(() => webcams.id),
	referenceId: text("reference_id").notNull(),
	gifType: text("gif_type").notNull(),
	scheduledTime: numeric("scheduled_time").notNull(),
	imageList: text("image_list", { mode: 'json' }).$type<string[]>().notNull(),
	status: text().default("pending"),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`),
	processedAt: numeric("processed_at"),
	errorMessage: text("error_message"),
	startTime: integer("start_time").default(0),
	endTime: integer("end_time").default(0),
	gifStorageKey: text("gif_storage_key"),
	dateKey: text("date_key"),
},
(table) => [
	index("idx_gif_queue_status_date").on(table.status, table.dateKey),
	index("idx_gif_queue_date_key").on(table.dateKey),
	index("idx_gif_queue_storage_key").on(table.gifStorageKey),
	index("idx_gif_queue_reference").on(table.referenceId),
	index("idx_gif_queue_webcam").on(table.webcamId),
	index("idx_gif_queue_status_time").on(table.status, table.scheduledTime),
]);

export const images = sqliteTable("images", {
	id: integer().primaryKey({ autoIncrement: true }),
	webcamId: integer("webcam_id").notNull().references(() => webcams.id),
	timeStamp: integer("time_stamp").notNull(),
	objectName: text("object_name").notNull(),
});

export const d1Migrations = sqliteTable("d1_migrations", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text(),
	appliedAt: numeric("applied_at").default(sql`(current_timestamp)`).notNull(),
});

export type WebcamDto = typeof webcams.$inferSelect;
export type Image = typeof images.$inferSelect;
export type WebcamActivityLog = typeof webcamActivityLog.$inferSelect;
export type WebcamError = typeof webcamErrors.$inferSelect;
export type WebcamDiagnostic = typeof webcamDiagnostics.$inferSelect;
export type GifCreationQueue = typeof gifCreationQueue.$inferSelect;
