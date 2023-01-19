import { getClientSideSymbologyConfigs, pipelineController } from '$lib/server/appConfig';
import { getLastPipelineMetricForConfig } from '$lib/server/logger/configMetrics';
import type { ConfigRunner } from '@onaio/symbology-calc-core';

/** @type {import('./$types').PageLoad} */
export function load() {
	const configs = getClientSideSymbologyConfigs();
	const ConfigsWithMetrics = configs.map((config) => {
		const metricForThisConfig = getLastPipelineMetricForConfig(config.uuid);
		const isRunning = (pipelineController.getPipelines(config.uuid) as ConfigRunner)?.isRunning();
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
