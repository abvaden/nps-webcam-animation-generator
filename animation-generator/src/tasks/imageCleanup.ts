import { IRepository } from "..//db/repositories";
import { R2CallTracker } from "../logic/r2-tracker";

/**
 * This function will remove all images older than 24 hrs unless they are specified to be kept by a given image retention policy
 */
export async function removeOldImages(repository: IRepository, now: Date, r2Tracker: R2CallTracker): Promise<void> {

}
