import { createDatabase, Database } from '../connection';
import { AnimationQueueRepository, IAnimationQueueRepository } from './animation-queue-repository';
import { DiagnosticsRepository, IDiagnosticsRepository } from './diagnostics-repository';
import { IImageRepository, ImageRepository } from './image-repository';
import { IWebcamRepository, WebcamRepository } from './webcam-repository';

// Repository exports for easy importing
export { WebcamRepository } from './webcam-repository';
export { AnimationQueueRepository } from './animation-queue-repository';
export { ImageRepository } from './image-repository';
export { DiagnosticsRepository } from './diagnostics-repository';


export interface IRepository
{
	webcams: IWebcamRepository,
	diagnostics: IDiagnosticsRepository,
	animationQueue: IAnimationQueueRepository,
	imageRepository: IImageRepository
}

export function RepositoryFactory(env: Env): IRepository {
	var database = createDatabase(env);
	return {
		animationQueue: new AnimationQueueRepository(database),
		diagnostics: new DiagnosticsRepository(database),
		imageRepository: new ImageRepository(database),
		webcams: new WebcamRepository(database)
	};
}
