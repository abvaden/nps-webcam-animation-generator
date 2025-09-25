import { calculateWebcamSolarTimes, parseLatLon } from './logic/solar-calculations';

import { Hono } from 'hono';
import { RepositoryFactory } from '@/db/repositories/index';
import { cleanupOldAnimations, createTodaysAnimations, prepareAnimationsForPendingQueue, processAllWebcams } from './tasks';
import { AnimationQueueEntry } from './types';

const app = new Hono<{ Bindings: Env }>();
(app as any).scheduled = (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
	// This function is called as part of a cron job that runs once a minute
	ctx.waitUntil((async () => {
		const now = new Date();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		const repo = RepositoryFactory(env);

		console.log(`Cron job running at ${now.toISOString()} (${currentHour}:${currentMinute.toString().padStart(2, '0')})`);

		try {
			// Once per day a few minutes before midnight (11:57 PM)
			if (currentHour === 23 && currentMinute === 57) {
				console.log('Running daily animation scheduling...');
				const dateString = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
				await createTodaysAnimations(repo, dateString);
			}

			// Always (every minute)
			await processAllWebcams(repo, env.STORAGE_BUCKET);
			await prepareAnimationsForPendingQueue(repo, now);

			// At the top of every hour (minute 0)
			if (currentMinute === 0) {
				console.log('Running hourly cleanup...');
				await cleanupOldAnimations(repo, now);
			}

		} catch (error) {
			console.error('Error in scheduled job:', error);
		}
	})());
};

app.get("gifs/to-create", async (c) => {
	const repo = RepositoryFactory(c.env);
	try {
		const pendingGifs = await repo.animationQueue.getPendingAnimations();
		return c.json({
			success: true,
			count: pendingGifs.length,
			gifs: pendingGifs
		});
	} catch (error) {
		console.error('Error fetching pending GIFs:', error);
		return c.json({
			success: false,
			error: 'Failed to fetch pending GIFs',
			message: error instanceof Error ? error.message : String(error)
		}, 500);
	}
});

app.get("webcams/:webcamId/solar-times", async (c) => {
	const repo = RepositoryFactory(c.env);
	try {
		// Parse webcam ID
		const webcamIdParam = c.req.param('webcamId');
		const webcamId = parseInt(webcamIdParam, 10);

		if (isNaN(webcamId)) {
			return c.json({
				success: false,
				error: 'Invalid webcam ID',
				message: 'Webcam ID must be a valid number'
			}, 400);
		}

		// Get optional date parameter (defaults to today)
		const dateParam = c.req.query('date');
		let targetDate: Date;

		if (dateParam) {
			// Validate date format (YYYY-MM-DD)
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			if (!dateRegex.test(dateParam)) {
				return c.json({
					success: false,
					error: 'Invalid date format',
					message: 'Date must be in YYYY-MM-DD format'
				}, 400);
			}

			targetDate = new Date(dateParam + 'T12:00:00Z'); // Use noon UTC to avoid timezone issues
			if (isNaN(targetDate.getTime())) {
				return c.json({
					success: false,
					error: 'Invalid date',
					message: 'Please provide a valid date'
				}, 400);
			}
		} else {
			targetDate = new Date(); // Use current date
		}

		// Fetch webcam from database
		const webcam = await repo.webcams.getWebcamById(webcamId);
		if (!webcam) {
			return c.json({
				success: false,
				error: 'Webcam not found',
				message: `No webcam found with ID ${webcamId}`
			}, 404);
		}

		// Check if webcam has location data
		if (!webcam.latLon) {
			return c.json({
				success: false,
				error: 'No location data',
				message: `Webcam ${webcam.name} does not have location coordinates`
			}, 422);
		}

		// Parse location coordinates
		let latitude: number, longitude: number;
		try {
			const coords = parseLatLon(webcam.latLon);
			latitude = coords.latitude;
			longitude = coords.longitude;
		} catch (error) {
			return c.json({
				success: false,
				error: 'Invalid location data',
				message: `Invalid coordinates format for webcam ${webcam.name}`
			}, 422);
		}

		// Calculate solar times
		const solarTimes = calculateWebcamSolarTimes(webcam.latLon, targetDate.getTime());
		if (!solarTimes) {
			return c.json({
				success: false,
				error: 'Solar calculation failed',
				message: 'Unable to calculate solar times for this location and date'
			}, 500);
		}

		// Format response with both UTC and local times
		const formatLocalTime = (utcTimestamp: number): string => {
			if (isNaN(utcTimestamp)) return 'N/A';

			// Create date in webcam's timezone
			const date = new Date(utcTimestamp);
			return date.toLocaleTimeString('en-US', {
				timeZone: webcam.timezone || 'America/Denver',
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		};

		const formatUtcTime = (utcTimestamp: number): string | null => {
			if (isNaN(utcTimestamp)) return null;
			return new Date(utcTimestamp).toISOString();
		};

		return c.json({
			success: true,
			webcam: {
				id: webcam.id,
				name: webcam.name,
				display_name: webcam.displayName,
				timezone: webcam.timezone,
				location: {
					latitude,
					longitude
				}
			},
			date: targetDate.toISOString().split('T')[0],
			solar_times: {
				sunrise: formatUtcTime(solarTimes.sunrise),
				sunset: formatUtcTime(solarTimes.sunset),
				first_light: formatUtcTime(solarTimes.firstLight),
				last_light: formatUtcTime(solarTimes.lastLight),
				day_length_hours: Math.round(solarTimes.dayLength * 100) / 100
			},
			local_times: {
				sunrise: formatLocalTime(solarTimes.sunrise),
				sunset: formatLocalTime(solarTimes.sunset),
				first_light: formatLocalTime(solarTimes.firstLight),
				last_light: formatLocalTime(solarTimes.lastLight)
			}
		});

	} catch (error) {
		console.error('Error fetching solar times:', error);
		return c.json({
			success: false,
			error: 'Internal server error',
			message: error instanceof Error ? error.message : String(error)
		}, 500);
	}
});

app.put("gifs/:id/complete", async (c) => {
	const repo = RepositoryFactory(c.env);
	try {
		// Parse GIF ID
		const gifIdParam = c.req.param('id');
		const gifId = parseInt(gifIdParam, 10);

		if (isNaN(gifId)) {
			return c.json({
				success: false,
				message: 'Invalid GIF ID. Must be a valid number'
			}, 400);
		}

		// Parse request body (optional - can be empty or contain success message)
		let requestBody: { success?: boolean; message?: string } = {};
		try {
			const body = await c.req.text();
			if (body.trim().length > 0) {
				requestBody = JSON.parse(body);
			}
		} catch (error) {
			return c.json({
				success: false,
				message: 'Request body must be valid JSON if provided'
			}, 400);
		}

		// Mark the GIF as completed
		const result = await repo.animationQueue.markAnimationCompleted(gifId);

		// Return appropriate status code based to result
		if (!result.success) {
			// Check for specific error types
			if (result.message.includes('not found')) {
				return c.json(result, 404);
			} else if (result.message.includes('not in pending status')) {
				return c.json(result, 409); // Conflict - wrong status
			} else {
				return c.json(result, 500);
			}
		}

		return c.json(result, 200);

	} catch (error) {
		console.error('Error marking GIF as completed:', error);
		return c.json({
			success: false,
			message: `Internal server error: ${error instanceof Error ? error.message : String(error)}`
		}, 500);
	}
});

app.get('gifs/schedule', async (c) => {
	const repo = RepositoryFactory(c.env);

	// Get optional date parameter (defaults to today)
	const dateParam = c.req.query('date');
	let dateValue;



	if (dateParam) {
		// Validate date format (YYYY-MM-DD)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(dateParam)) {
			return c.json({
				success: false,
				error: 'Invalid date format',
				message: 'Date must be in YYYY-MM-DD format'
			}, 400);
		}

		dateValue = dateParam;
	} else {
		const now = new Date(); // Use current date
		dateValue = `${now.getUTCFullYear()}-${now.getUTCMonth().toFixed(0).padStart(2, '0')}-${(now.getUTCDate() + 1).toFixed(0).padStart(2, '0')}`;
	}

	let animationSummary: {success: boolean,item: AnimationQueueEntry }[];
	try {
		animationSummary = await createTodaysAnimations(repo, dateValue);
		await prepareAnimationsForPendingQueue(repo, new Date());
	} catch (e) {
		console.log(e)
		return c.json({
			success: false,
			error: e
		})
	}



	return c.json({
		success: true,
		items: animationSummary
	});
});

// Configuration endpoint
app.get("config", async (c) => {
	try {
		return c.json({
			success: true,
			config: {
				r2_public_base_url: c.env.R2_PUBLIC_BASE_URL
			}
		});
	} catch (error) {
		console.error('Error fetching config:', error);
		return c.json({
			success: false,
			error: 'Failed to fetch configuration',
			message: error instanceof Error ? error.message : String(error)
		}, 500);
	}
});

app.get('process', async (c) => {

	const repo = RepositoryFactory(c.env);

	await processAllWebcams(repo, c.env.STORAGE_BUCKET);
})

// Gallery API endpoints
app.get("gallery/parks", async (c) => {
	try {
		const result = await c.env.WEBCAM_DB.prepare(`
			SELECT
				w.national_park,
				COUNT(DISTINCT w.id) as webcam_count,
				COUNT(CASE WHEN gq.gif_storage_key IS NOT NULL THEN gq.id END) as gif_count
			FROM webcams w
			LEFT JOIN gif_creation_queue gq ON w.id = gq.webcam_id AND gq.status = 'completed'
			WHERE w.enabled = 1
			GROUP BY w.national_park
			ORDER BY w.national_park
		`).all<any>();

		const parks = result.results.map((park: any) => ({
			name: park.national_park,
			webcam_count: park.webcam_count,
			gif_count: park.gif_count
		}));

		return c.json({
			success: true,
			parks
		});
	} catch (error) {
		console.error('Error fetching parks:', error);
		return c.json({
			success: false,
			error: 'Failed to fetch parks',
			message: error instanceof Error ? error.message : String(error)
		}, 500);
	}
});

app.get("gallery/parks/:park/webcams", async (c) => {
	try {
		const park = c.req.param('park');

		const result = await c.env.WEBCAM_DB.prepare(`
			SELECT
				w.id,
				w.name,
				w.display_name,
				w.last_active_at,
				COUNT(CASE WHEN gq.gif_type = 'sunrise' AND gq.status = 'completed' AND gq.gif_storage_key IS NOT NULL THEN 1 END) as sunrise_count,
				COUNT(CASE WHEN gq.gif_type = 'sunset' AND gq.status = 'completed' AND gq.gif_storage_key IS NOT NULL THEN 1 END) as sunset_count,
				COUNT(CASE WHEN gq.gif_type = 'hourly' AND gq.status = 'completed' AND gq.gif_storage_key IS NOT NULL THEN 1 END) as hourly_count,
				COUNT(CASE WHEN gq.gif_type = 'full_day' AND gq.status = 'completed' AND gq.gif_storage_key IS NOT NULL THEN 1 END) as full_day_count,
				COUNT(CASE WHEN gq.gif_type = 'on_demand' AND gq.status = 'completed' AND gq.gif_storage_key IS NOT NULL THEN 1 END) as on_demand_count
			FROM webcams w
			LEFT JOIN gif_creation_queue gq ON w.id = gq.webcam_id
			WHERE w.national_park = ? AND w.enabled = 1
			GROUP BY w.id, w.name, w.display_name, w.last_active_at
			ORDER BY w.name
		`).bind(park).all<any>();

		const webcams = result.results.map((webcam: any) => ({
			id: webcam.id,
			name: webcam.name,
			display_name: webcam.display_name,
			last_active_at: webcam.last_active_at,
			gif_counts: {
				sunrise: webcam.sunrise_count,
				sunset: webcam.sunset_count,
				hourly: webcam.hourly_count,
				full_day: webcam.full_day_count,
				on_demand: webcam.on_demand_count
			}
		}));

		return c.json({
			success: true,
			park,
			webcams
		});
	} catch (error) {
		console.error('Error fetching webcams:', error);
		return c.json({
			success: false,
			error: 'Failed to fetch webcams',
			message: error instanceof Error ? error.message : String(error)
		}, 500);
	}
});

app.get("gallery/webcams/:webcamId/gifs", async (c) => {
	try {
		const webcamIdParam = c.req.param('webcamId');
		const webcamId = parseInt(webcamIdParam, 10);

		if (isNaN(webcamId)) {
			return c.json({
				success: false,
				error: 'Invalid webcam ID',
				message: 'Webcam ID must be a valid number'
			}, 400);
		}

		// Get optional filters
		const gifType = c.req.query('type');
		const limit = parseInt(c.req.query('limit') || '50', 10);
		const offset = parseInt(c.req.query('offset') || '0', 10);

		// Build query with optional type filter - only return GIFs with storage keys
		let query = `
			SELECT
				gq.id,
				gq.gif_type,
				gq.created_at,
				gq.processed_at,
				gq.gif_storage_key,
				gq.status,
				gq.date_key,
				w.name as webcam_name,
				w.display_name as webcam_display_name,
				w.national_park
			FROM gif_creation_queue gq
			JOIN webcams w ON gq.webcam_id = w.id
			WHERE gq.webcam_id = ? AND gq.status = 'completed' AND gq.gif_storage_key IS NOT NULL
		`;

		const params: (string | number)[] = [webcamId];

		if (gifType && ['sunrise', 'sunset', 'hourly', 'full_day', 'on_demand'].includes(gifType)) {
			query += ` AND gq.gif_type = ?`;
			params.push(gifType);
		}

		query += ` ORDER BY gq.created_at DESC LIMIT ? OFFSET ?`;
		params.push(limit);
		params.push(offset);

		const result = await c.env.WEBCAM_DB.prepare(query).bind(...params).all<any>();

		const gifs = result.results.map((gif: any) => ({
			id: gif.id,
			gif_type: gif.gif_type,
			created_at: gif.created_at,
			processed_at: gif.processed_at,
			gif_storage_key: gif.gif_storage_key,
			status: gif.status,
			webcam_name: gif.webcam_name,
			webcam_display_name: gif.webcam_display_name,
			national_park: gif.national_park,
			date_key: gif.date_key
		}));

		return c.json({
			success: true,
			webcam_id: webcamId,
			gifs,
			pagination: {
				limit,
				offset,
				count: gifs.length
			}
		});
	} catch (error) {
		console.error('Error fetching webcam GIFs:', error);
		return c.json({
			success: false,
			error: 'Failed to fetch webcam GIFs',
			message: error instanceof Error ? error.message : String(error)
		}, 500);
	}
});


export default app;
