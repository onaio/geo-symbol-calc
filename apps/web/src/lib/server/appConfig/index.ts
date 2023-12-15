import { PipelinesController } from '@onaio/symbology-calc-core';
import type { SingleApiSymbolConfig } from 'src/lib/shared/types';
import { geoSymbolLogger } from '../logger/winston';
import { allSymbolConfigsAccessor } from '$lib/server/constants';
import { uniqWith } from 'lodash-es';
import { getConfig } from './utils';
import { readMetricOverride, writePripelineMetrics } from '../logger/configMetrics';

export function getAllSymbologyConfigs() {
	const rawSymbologyConfigs = getConfig(
		allSymbolConfigsAccessor,
		[],
		false
	) as SingleApiSymbolConfig[];
	const allSymbologyConfigs = rawSymbologyConfigs.map((config) => {
		return {
			...config,
			logger: geoSymbolLogger,
			writeMetric: writePripelineMetrics,
			readMetric: readMetricOverride
		};
	});
	const uniqAllSymbolConfigs = uniqWith(allSymbologyConfigs, (config1, config2) => {
		return config1.uuid === config2.uuid;
	});

	return uniqAllSymbolConfigs;
}

export function getClientSideSymbologyConfigs() {
	const allSymbologyConfigs = getAllSymbologyConfigs();
	return (allSymbologyConfigs ?? []).map((symbologyConfig: SingleApiSymbolConfig) => {
		const { baseUrl, visitFormId, regFormId, symbolConfig, schedule, uuid, title } =
			symbologyConfig;
		return { baseUrl, visitFormId, regFormId, symbolConfig, schedule, uuid, title };
	});
}

export const pipelineController = new PipelinesController(getAllSymbologyConfigs);
