import { getClientSideSymbologyConfigs, pipelineController } from '$lib/server/appConfig';
import { getLastPipelineMetricForConfig } from '$lib/server/logger/configMetrics';
import type { ConfigRunner } from '@onaio/symbology-calc-core';

/** @type {import('./$types').PageLoad} */
export function load({params}) {
	const uuid = params.slug ?? '';
	const configs = getClientSideSymbologyConfigs().filter(config => config.uuid === uuid);
	const ConfigsWithMetrics = configs.map((config) => {
		const configId = config.uuid;
		const metricForThisConfig = getLastPipelineMetricForConfig(configId);
		const pipeLineRunner = pipelineController.getPipelines(configId) as ConfigRunner;
		const isRunning = pipeLineRunner?.isRunning();
		return {
			...config,
			metric: metricForThisConfig,
			isRunning,
			invalidityErrror: pipeLineRunner?.invalidError ?? null
		};
	});
	return {
		configs: ConfigsWithMetrics
	};
}
