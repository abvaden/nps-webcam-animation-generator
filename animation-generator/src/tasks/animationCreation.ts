import { IRepository } from "../db/repositories";
import { AnimationQueueEntry, AnimationType } from "../types";
import { generateAnimationStorageKey } from "../logic/animations";
import { calculateWebcamSolarTimes } from "../logic/solar-calculations";
import { getLocalDateKeyFromISOString } from "../logic/timezone";
import { DateTime } from 'luxon';
import { AnimationQueueRepository } from "@/db/repositories/animation-queue-repository";
import { WebcamDto } from "@/db/schema";

/**
 * Helper function to create a animation entry object
 */
export function createAnimationEntry(
	webcam: WebcamDto,
	animationType: AnimationType,
	scheduledTime: Date,
	startTime: number,
	endTime: number,
): AnimationQueueEntry {

	const dateTime = DateTime.fromSeconds(startTime).setZone(webcam.timezone ?? '');

	const dateStr = dateTime.toFormat('yyyyMMdd');
	const hourStr = dateTime.toLocaleString({
		hour: '2-digit',
		hour12: false
	});


	let referenceId: string;
	if (animationType === 'hourly') {
		referenceId = `${webcam.id}_${animationType}_${dateStr}_${hourStr}`;
	} else {
		referenceId = `${webcam.id}_${animationType}_${dateStr}`;
	}

	// Generate storage key for the animation
	const storageKey = generateAnimationStorageKey(webcam.nationalPark || 'unknown', webcam.name, animationType, scheduledTime.getTime());

	// Calculate date_key based on webcam timezone
	const dateKey = getLocalDateKeyFromISOString(scheduledTime.toISOString(), webcam.timezone || 'America/Denver');

	return {
		id: 0,
		webcam_id: webcam.id,
		reference_id: referenceId,
		gif_type: animationType,
		scheduled_time: scheduledTime.toISOString(),
		date_key: dateKey,
		image_list: [], // Empty initially for 'waiting_for_images' status
		status: 'waiting_for_images',
		created_at: new Date().toISOString(),
		processed_at: null,
		error_message: null,
		start_time: startTime,
		end_time: endTime,
		gif_storage_key: storageKey
	};
}

/**
 * This function will create all the animations for a given day for each camera and set them of status of "waiting_for_images"
 *
 * The date string param should be in the format of YYYY-MM-DD
 *
 * This function will create
 *  - 'hourly' animations for all hours from sunrise to sunset for the given day in the webcam's timezone
 *  - 'full_day' animations for the day specified in the webcams timezone
 *  - 'sunrise' and 'sunset' animations for the specified day in the webcams timezone
 *
 * Example: when given the dateString '2025-09-24' and a webcam located at 39.740, -104.975 with the timezone America/Denver
 *  - This webcam should have a sunrise at 06:49 local time and a sunset of 18:53 local time for the given date of 2025-09-24
 *  - This webcam should have a first light of time 05:51 local time and last light of 19:51 local time for the given date of 2025-09-24
 *  - Hourly animations including the hour of first and last light 1: (2025-09-24T06:00:00+06:00) -> (2025-09-24T07:00:00+06:00) ... x: (2025-09-24T18:00:00+06:00) -> (2025-09-24T19:00:00+06:00)
 *  - The sunrise and sunset animations should calculate a value sunriseDuration which should equal sunrise - first light this value will be used in the timing for sunrise and sunset animations
 *    in our example case this means sunrise duration is 58 minutes
 *  - Sunrise animations should be from first list - (.25 * sunriseDuration) to sunrise + (.25 sunriseDuration)
 *    in our example this mean our animation should be 05:51 - (.25 * 58 mins) to 06:49 + (.25 * 58mins)
 *    or (2025-09-24T05:26:30+06:00) -> (2025-09-24T07:03:30+06:00)
 *  - Sunset animations should use the same form of calculation but use the last light and sunset time instead
 *  - The full day should start at the same time the sun rise animation starts and end when the sunset animation ends
 *  - The date key value should be the same as the dateString that was provided
 */
export async function createTodaysAnimations(repo: IRepository, dateString: string): Promise<void> {
	const webcams = await repo.webcams.getEnabledWebcams();
	const animationsToCreate: AnimationQueueEntry[] = [];

	// Validate date format (YYYY-MM-DD)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(dateString))
		throw new Error('invalid date must be (YYYY-MM-DD)');

	const now = new Date(`${dateString}T03:00:00Z`);

	console.log(`Creating daily animations for ${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`);
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
		const webcamNow = DateTime.fromFormat(`${dateString} 03:00:00`, 'yyyy-MM-dd HH:mm:ss')
		const solarTimes = calculateWebcamSolarTimes(webcam.latLon, webcamNow.toUnixInteger() * 1000);
		if (!solarTimes) {
			console.log(`Could not calculate solar times for ${webcam.name}`);
			continue;
		}

		const sunriseDuration = solarTimes.sunrise - solarTimes.firstLight;
		const sunsetDuration = solarTimes.lastLight - solarTimes.sunset;
		const lightStart = solarTimes.firstLight - (0.25 * sunriseDuration);
		const sunriseEnd = solarTimes.sunrise + (0.25 * sunriseDuration);
		const sunsetStart = solarTimes.sunset - (0.25 * sunsetDuration);
		const lightEnd = solarTimes.lastLight + (0.25 * sunsetDuration);

		// Generate a sunrise animation (firstLight to sunrise)
		if (!isNaN(lightStart) && !isNaN(lightEnd)) {

			const sunriseAnimation = createAnimationEntry(
				webcam,
				'sunrise',
				new Date(sunriseEnd + (1 * 60 * 1000)), // Schedule 1 minutes after sunriseEnd
				Math.floor(lightStart / 1000), // Convert to seconds
				Math.floor(sunriseEnd/ 1000)
			);
			animationsToCreate.push(sunriseAnimation);
		}

		// Generate a sunset animation (sunset to lastLight)
		if (!isNaN(sunsetStart) && !isNaN(lightEnd)) {

			const sunsetAnimation = createAnimationEntry(
				webcam,
				'sunset',
				new Date(lightEnd + (1 * 60 * 1000)), /// Schedule 1 minute after lightEnd
				Math.floor(sunsetStart / 1000),
				Math.floor(lightEnd / 1000)
			);
			animationsToCreate.push(sunsetAnimation);
		}

		// Generate a sunrise to sunset animation (full day)
		if (!isNaN(lightStart) && !isNaN(lightEnd)) {
			const fullDayAnimation = createAnimationEntry(
				webcam,
				'full_day',
				new Date(lightEnd + (1 * 60 * 1000)), // Schedule 1 minute after lightEnd
				Math.floor(lightStart / 1000),
				Math.floor(lightEnd / 1000)
			);
			animationsToCreate.push(fullDayAnimation);
		}

		// Generate hourly animation for each hour between sunrise and sunset
		if (!isNaN(lightStart) && !isNaN(lightEnd)) {
			const lightStartHour = new Date(lightStart);
			const lightEndHour = new Date(lightEnd);

			// Round sunrise up to next hour
			lightStartHour.setMinutes(0, 0, 0);
			if (lightStartHour.getTime() < solarTimes.firstLight) {
				lightStartHour.setHours(lightStartHour.getHours() + 1);
			}

			// Generate hourly animations
			const currentHour = new Date(lightStartHour);
			while (currentHour.getTime() < lightEndHour.getTime()) {
				const nextHour = new Date(currentHour);
				nextHour.setHours(nextHour.getHours() + 1);

				// Don't create hourly animation if it would extend past lightEnd
				if (nextHour.getTime() <= lightEndHour.getTime()) {
					const hourlyAnimation = createAnimationEntry(
						webcam,
						'hourly',
						new Date(nextHour.getTime() + (5 * 60 * 1000)), // Schedule 5 minutes after hour ends
						Math.floor(currentHour.getTime() / 1000),
						Math.floor(nextHour.getTime() / 1000)
					);
					animationsToCreate.push(hourlyAnimation);
				}

				currentHour.setHours(currentHour.getHours() + 1);
			}
		}
	}

	// Add all of the animation from the animationToCreate collection to the database
	if (animationsToCreate.length > 0) {
		try {
			for (const animation of animationsToCreate) {
				if (!await repo.animationQueue.addAnimationsToQueue([animation])) {
					console.log(`Failed to write animation to db : ${animation.reference_id}`);
				}
			}


			console.log(`Successfully scheduled ${animationsToCreate.length} animations for tomorrow across ${webcams.length} webcams`);
		} catch (error) {
			console.error('Failed to insert animations into database:', error);
		}
	} else {
		console.log('No animations were scheduled - no webcams with valid location data');
	}

	// Log how many animations were scheduled
	const animationsByType = animationsToCreate.reduce((acc, gif) => {
		acc[gif.gif_type] = (acc[gif.gif_type] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	console.log(`Animation scheduling summary:`, animationsByType);
}
