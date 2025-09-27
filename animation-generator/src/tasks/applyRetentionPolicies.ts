import { IRepository } from "@/db/repositories";
import { SolarNoonRetentionPolicy, SunriseRetentionPolicy, SunsetRetentionPolicy } from "@/logic/retention-policy";
import { calculateWebcamSolarTimes } from "@/logic/solar-calculations";
import { DateTime } from "luxon";

export async function applyRetentionPolicies(repo: IRepository, r2: R2Bucket, dateStamp: string): Promise<void> {
	// Validate date format (YYYY-MM-DD)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(dateStamp))
		throw new Error('invalid date must be (YYYY-MM-DD)');

	// Utc
	const now = new Date(`${dateStamp}T03:00:00Z`);
	console.log(`Applying retention policies for webcams on date : ${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toFixed(0).padStart(2, '0')}-${now.getUTCDate()}`);

	const webcams = await repo.webcams.getAllWebcams();


	for (const webcam of webcams) {
		// Skip webcams without location data
		if (!webcam.latLon) {
			console.log(`Skipping animation scheduling for ${webcam.name} - no location data`);
			continue;
		}

		if (!webcam.timezone) {
			console.log(`Skipping animation scheduling for ${webcam.name} - no timezone data`);
			continue;
		}


		// Calculate solar times for "today" in terms of the webcams timezone
		const webcamDailyOffset = DateTime.fromJSDate(now).setZone(webcam.timezone).offset;
		const webcamStartOfDay = new Date(now.valueOf() - (webcamDailyOffset * 60 * 1000) - 3 * 60 * 60 * 1000);

		const solarTimes = calculateWebcamSolarTimes(webcam.latLon, webcamStartOfDay.valueOf());
		if (!solarTimes) {
			console.log(`Could not calculate solar times for ${webcam.name}`);
			continue;
		}


		// Apply all of the image retention policies

		const start = webcamStartOfDay.valueOf() / 1000;
		const end = start + (24 * 60 * 60) - 1;
		await SunriseRetentionPolicy.apply(repo, start, end);
		// await SunsetRetentionPolicy.apply(repo, startOfDay, endOfDay);
		// await SolarNoonRetentionPolicy.apply(repo, startOfDay, endOfDay);

		const imagesToRemove = await repo.imageRepository.getAllImagesForTimeRangeWoRetentionPolicy(start, end);
		for (const imageToRemove of imagesToRemove) {
			console.log(imageToRemove.objectName);
		}
	}
}
