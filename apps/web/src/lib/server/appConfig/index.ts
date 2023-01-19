import { PipelinesController, validateConfigs } from '@onaio/symbology-calc-core';
import type { SingleApiSymbolConfig } from 'src/lib/shared/types';
import { geoSymbolLogger } from '../logger/winston';
import { allSymbolConfigsAccessor } from '$lib/server/constants';
import { uniqWith } from 'lodash-es';
import yup from 'yup';
import type { Config } from '@onaio/symbology-calc-core';
import { getConfig } from './utils';
import { readMetricOverride, writePripelineMetrics } from '../logger/configMetrics';

export function webValidateConfigs(config: Config) {
	const extraSchema = yup.object().shape({
		uuid: yup.string().uuid().required('Symbology config does not have a uuid')
	});

	validateConfigs(config);
	extraSchema.validateSync(config);
}

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
	allSymbologyConfigs.forEach(webValidateConfigs);
	const uniqAllSymbolConfigs = uniqWith(allSymbologyConfigs, (config1, config2) => {
		return config1.uuid === config2.uuid;
	});

	return uniqAllSymbolConfigs;
}

export function getClientSideSymbologyConfigs() {
	const allSymbologyConfigs = getAllSymbologyConfigs();
	return (allSymbologyConfigs ?? []).map((symbologyConfig: SingleApiSymbolConfig) => {
		const { baseUrl, visitFormId, regFormId, symbolConfig, schedule, uuid } = symbologyConfig;
		return { baseUrl, visitFormId, regFormId, symbolConfig, schedule, uuid };
	});
}

export const pipelineController = new PipelinesController(getAllSymbologyConfigs);
