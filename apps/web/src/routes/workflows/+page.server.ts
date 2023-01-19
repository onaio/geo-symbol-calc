import { getClientSideSymbologyConfigs, pipelineController } from '$lib/server/appConfig';
import { getLastPipelineMetricForConfig } from '$lib/server/logger/configMetrics';

/** @type {import('./$types').PageLoad} */
export function load() {
	const configs = getClientSideSymbologyConfigs();
	const ConfigsWithMetrics = configs.map((config) => {
		const metricForThisConfig = getLastPipelineMetricForConfig(config.uuid);
		const isRunning = pipelineController.getPipeline(config.uuid)?.isRunning();
		return {
			...config,
			metric: metricForThisConfig,
			isRunning
		};
	});
	return {
		configs: ConfigsWithMetrics
	};
}
