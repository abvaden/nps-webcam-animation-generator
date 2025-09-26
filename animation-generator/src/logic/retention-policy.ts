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
            const days: Date[] = []; // empty for now

            for (const day of days) {
                const solarTimes = calculateWebcamSolarTimes(webcam.latLon, day.getTime());

                if (!solarTimes || isNaN(solarTimes.sunrise) || isNaN(solarTimes.firstLight)) {
                    console.log('Could not calculate sunrise retention target for webcam : ' + webcam.displayName);
                    continue;
                }

                const imageTime = (solarTimes.sunrise + solarTimes.firstLight) / 2;

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
