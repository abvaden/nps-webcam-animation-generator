import { IRepository } from "@/db/repositories";
import { RetentionPolicy } from "@/types";
import { calculateWebcamSolarTimes } from "./solar-calculations";


// Sunrise image retention policy should ensure that each webcam has only 1 image in a given day has
// the image retention policy of sunrise set. The image to save should be between first light and sunrise
export const SunriseRetentionPolicy: RetentionPolicy = {
    name: 'Sunrise',

    apply: async (repo: IRepository, start: number, end: number) => {
        const webcams = await repo.webcams.getAllWebcams();
        for (const webcam of webcams) {
            // calculate all the uniqe days in the time range in the webcams given timezone

			const startDay = new Date(start * 1000);
			const endDay = new Date(end * 1000);
            const days: Date[] = []; // empty for now
			let currentDay = startDay;
			while(currentDay <= endDay) {
				days.push(currentDay);

				currentDay = new Date(currentDay.getUTCFullYear(), currentDay.getUTCMonth(), currentDay.getUTCDate() + 1, 0, 0, 0);
			}

			console.log('start ' + start);
			console.log('end ' + end);


            for (const day of days) {
                const solarTimes = calculateWebcamSolarTimes(webcam.latLon, day.getTime());

                if (!solarTimes || isNaN(solarTimes.sunrise) || isNaN(solarTimes.firstLight)) {
                    console.log('Could not calculate sunrise retention target for webcam : ' + webcam.displayName);
                    continue;
                }

                const imageTime = (solarTimes.sunrise + solarTimes.firstLight) / 2 / 1000;

				console.log('imageTime ' + imageTime);

                // find the image that is closest to the value of solarTimes.sunriseTime and is within -5 and + 15 minutes of sunrise
                const images = await repo.imageRepository.getImagesForTimeRange(webcam, imageTime - (5 * 60), (15 * 60) + imageTime);

                // Find the image that is closest to imageTime
                const sunriseImage = images.sort((a, b) => Math.abs(a.timeStamp - imageTime) - Math.abs(b.timeStamp - imageTime))[0];

                if (!sunriseImage) {
                    console.log('No images found in matching sunrise window');
                    continue;
                }

				const notSunriseImages = images.filter(x => (x.id !== sunriseImage.id));
				const needsPolicyRemoved = notSunriseImages.filter(x => (x.retentionPolicy ?? []).some(x => x == 'Sunrise'));
				for (const imageToRemovePolicy of needsPolicyRemoved) {
					imageToRemovePolicy.retentionPolicy = (imageToRemovePolicy.retentionPolicy ?? []).filter(x => x != 'Sunrise');
					if (!await repo.imageRepository.putImage(imageToRemovePolicy)) {
						console.log('Failed to remove sunrise image retention policy sunrise from image : ' + imageToRemovePolicy.id);
					}
				}

                if (sunriseImage.retentionPolicy?.includes('Sunrise')) {
                    continue;
                }

                sunriseImage.retentionPolicy ??= [];
                sunriseImage.retentionPolicy.push('Sunrise');

                if (!await repo.imageRepository.putImage(sunriseImage)) {
                    console.log('Failed to add image retention policy sunrise to image : ' + sunriseImage.id);
                }

            }
        }
    }
};

// Solar noon image retention policy should ensure that each webcam has only 1 image in a given day has
// the image retention policy of solar noon set. The image to save should be closest to solar noon
export const SolarNoonRetentionPolicy: RetentionPolicy = {
    name: 'SolarNoon',

    apply: async (repo: IRepository, start: number, end: number) => {
        const webcams = await repo.webcams.getAllWebcams();
        for (const webcam of webcams) {

            // calculate all the unique days in the time range in the webcams given timezone
            const days: Date[] = []; // empty for now

            for (const day of days) {
                const solarTimes = calculateWebcamSolarTimes(webcam.latLon, day.getTime());

                if (!solarTimes || isNaN(solarTimes.sunrise) || isNaN(solarTimes.sunset)) {
                    console.log('Could not calculate solar noon retention target for webcam : ' + webcam.displayName);
                    continue;
                }

                // Solar noon is the midpoint between sunrise and sunset
                const imageTime = (solarTimes.sunrise + solarTimes.sunset) / 2;

                // find the image that is closest to solar noon and is within -15 and + 15 minutes of solar noon
                const images = await repo.imageRepository.getImagesForTimeRange(webcam, imageTime - (15 * 60 * 1000), (15 * 60 * 1000) + imageTime);

                // Find the image that is closest to imageTime
                const solarNoonImage = images.sort((a, b) => Math.abs(a.timeStamp * 1000 - imageTime) - Math.abs(b.timeStamp * 1000 - imageTime))[0];

                if (!solarNoonImage) {
                    console.log('No images found in matching solar noon window');
                    continue;
                }

                const notSolarNoonImages = images.filter(x => (x.id !== solarNoonImage.id));
                const needsPolicyRemoved = notSolarNoonImages.filter(x => (x.retentionPolicy ?? []).some(x => x == 'SolarNoon'));
                for (const imageToRemovePolicy of needsPolicyRemoved) {
                    imageToRemovePolicy.retentionPolicy = (imageToRemovePolicy.retentionPolicy ?? []).filter(x => x != 'SolarNoon');
                    if (!await repo.imageRepository.putImage(imageToRemovePolicy)) {
                        console.log('Failed to remove solar noon image retention policy from image : ' + imageToRemovePolicy.id);
                    }
                }

                if (solarNoonImage.retentionPolicy?.includes('SolarNoon')) {
                    continue;
                }

                solarNoonImage.retentionPolicy ??= [];
                solarNoonImage.retentionPolicy.push('SolarNoon');

                if (!await repo.imageRepository.putImage(solarNoonImage)) {
                    console.log('Failed to add image retention policy solar noon to image : ' + solarNoonImage.id);
                }
            }
        }
    }
};

// Sunset image retention policy should ensure that each webcam has only 1 image in a given day has
// the image retention policy of sunset set. The image to save should be between sunset and last light
export const SunsetRetentionPolicy: RetentionPolicy = {
    name: 'Sunset',

    apply: async (repo: IRepository, start: number, end: number) => {
        const webcams = await repo.webcams.getAllWebcams();
        for (const webcam of webcams) {

            // calculate all the unique days in the time range in the webcams given timezone
            const days: Date[] = []; // empty for now

            for (const day of days) {
                const solarTimes = calculateWebcamSolarTimes(webcam.latLon, day.getTime());

                if (!solarTimes || isNaN(solarTimes.sunset) || isNaN(solarTimes.lastLight)) {
                    console.log('Could not calculate sunset retention target for webcam : ' + webcam.displayName);
                    continue;
                }

                const imageTime = (solarTimes.sunset + solarTimes.lastLight) / 2;

                // find the image that is closest to the sunset midpoint and is within -15 and + 5 minutes of sunset
                const images = await repo.imageRepository.getImagesForTimeRange(webcam, imageTime - (15 * 60 * 1000), (5 * 60 * 1000) + imageTime);

                // Find the image that is closest to imageTime
                const sunsetImage = images.sort((a, b) => Math.abs(a.timeStamp * 1000 - imageTime) - Math.abs(b.timeStamp * 1000 - imageTime))[0];

                if (!sunsetImage) {
                    console.log('No images found in matching sunset window');
                    continue;
                }

                const notSunsetImages = images.filter(x => (x.id !== sunsetImage.id));
                const needsPolicyRemoved = notSunsetImages.filter(x => (x.retentionPolicy ?? []).some(x => x == 'Sunset'));
                for (const imageToRemovePolicy of needsPolicyRemoved) {
                    imageToRemovePolicy.retentionPolicy = (imageToRemovePolicy.retentionPolicy ?? []).filter(x => x != 'Sunset');
                    if (!await repo.imageRepository.putImage(imageToRemovePolicy)) {
                        console.log('Failed to remove sunset image retention policy from image : ' + imageToRemovePolicy.id);
                    }
                }

                if (sunsetImage.retentionPolicy?.includes('Sunset')) {
                    continue;
                }

                sunsetImage.retentionPolicy ??= [];
                sunsetImage.retentionPolicy.push('Sunset');

                if (!await repo.imageRepository.putImage(sunsetImage)) {
                    console.log('Failed to add image retention policy sunset to image : ' + sunsetImage.id);
                }
            }
        }
    }
};
