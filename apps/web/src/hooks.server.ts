import { pipelineController } from '$lib/server/appConfig';
import { configDir } from '$lib/server/constants';
import { watch } from 'node:fs/promises';

pipelineController.evaluateOnSchedule();

(async () => {
	const watcher = watch(configDir);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	for await (const _event of watcher) {
		if (_event.eventType === 'change' && _event.filename === 'local.json') {
			pipelineController.reEvaluatedScheduled();
		}
	}
})();
