import { IRepository } from "../db/repositories";


// This function will remove all animations from the repository and from R2 that are considered
// stale
export async function cleanupOldAnimations(repo: IRepository, now: Date): Promise<void> {
	 try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

	  // Remove hourly animation that are more than 48 hours old from repo, every animation that is removed should also be removed from R2

	  // Remove full_day animations that are > 30 days old repo, every animation that is removed should also be removed from R2

	  // Remove sunrise and sunset animations that are > 30 days old repo, every animation that is removed should also be removed from R2

      console.log('Cleaned up old animation queue entries');
    } catch (error) {
      console.error('Failed to cleanup old animation entries:', error);
    }
}
