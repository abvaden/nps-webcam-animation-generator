import { relations } from "drizzle-orm/relations";
import { webcams, webcamDiagnostics, webcamErrors, webcamActivityLog, gifCreationQueue, images } from "./schema";

export const webcamDiagnosticsRelations = relations(webcamDiagnostics, ({one}) => ({
	webcam: one(webcams, {
		fields: [webcamDiagnostics.webcamId],
		references: [webcams.id]
	}),
}));

export const webcamsRelations = relations(webcams, ({many}) => ({
	webcamDiagnostics: many(webcamDiagnostics),
	webcamErrors: many(webcamErrors),
	webcamActivityLogs: many(webcamActivityLog),
	gifCreationQueues: many(gifCreationQueue),
	images: many(images),
}));

export const webcamErrorsRelations = relations(webcamErrors, ({one}) => ({
	webcam: one(webcams, {
		fields: [webcamErrors.webcamId],
		references: [webcams.id]
	}),
}));

export const webcamActivityLogRelations = relations(webcamActivityLog, ({one}) => ({
	webcam: one(webcams, {
		fields: [webcamActivityLog.webcamId],
		references: [webcams.id]
	}),
}));

export const gifCreationQueueRelations = relations(gifCreationQueue, ({one}) => ({
	webcam: one(webcams, {
		fields: [gifCreationQueue.webcamId],
		references: [webcams.id]
	}),
}));

export const imagesRelations = relations(images, ({one}) => ({
	webcam: one(webcams, {
		fields: [images.webcamId],
		references: [webcams.id]
	}),
}));