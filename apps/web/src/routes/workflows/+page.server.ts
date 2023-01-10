import { getClientSideSymbologyConfigs } from '$lib/server/appConfig';
import { getLastPipelineMetricForConfig } from '$lib/server/logger/configMetrics';

/** @type {import('./$types').PageLoad} */
export function load() {
	const configs = getClientSideSymbologyConfigs();
	const ConfigsWithMetrics = configs.map((config) => {
		const metricForThisConfig = getLastPipelineMetricForConfig(config.uuid);
		return {
			...config,
			metric: metricForThisConfig
		};
	});
	return {
		configs: ConfigsWithMetrics
	};
}
