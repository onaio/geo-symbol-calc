import { pipelineController } from '$lib/server/appConfig';
import { localConfigFile } from '$lib/server/constants';
import { logger } from '$lib/server/logger/winston';
import { watch } from 'chokidar';

pipelineController.runOnSchedule();

// Watch the file for changes
const watcher = watch(localConfigFile);

(async () => {
	watcher
		.on('change', (path) => {
			logger.info(`Local config file at ${path} was changed`);
			pipelineController.refreshConfigRunners();
		})
		.on('error', (error) => {
			logger.error(`Error reading local config file: ${error}`);
		});
})();
