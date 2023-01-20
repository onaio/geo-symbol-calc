/** Save configuration runs metrics to a file. */
import fs from 'node:fs';
import { metricsJsonFile } from '../constants';
import { Result, type uuid } from '@onaio/symbology-calc-core';
import { LogMessageLevels, type Metric } from '@onaio/symbology-calc-core';
import { geoSymbolLogger } from './winston';

/** minimal array-based stack data structure for metric store operations. */
class MetricStoreStack {
	// mutable array based store for the stack
	private store: Array<Metric>;
	private size: number;

	constructor(size: number, sequence?: Array<Metric>) {
		if (sequence && sequence.length > size) {
			throw new Error('Sequence has a larger size than the store is initialized with');
		} else if (sequence) {
			this.store = [...sequence];
		} else {
			this.store = [];
		}
		this.size = size;
	}

	isEmpty() {
		return this.store.length === 0;
	}

	push(metric: Metric) {
		if (this.store.length === this.size) {
			this.store.shift();
			this.store.push(metric);
		} else {
			this.store.push(metric);
		}
	}

	getSequence() {
		return this.store;
	}
}

function writeMetricsToFile(metrics: unknown) {
	fs.writeFileSync(metricsJsonFile, JSON.stringify(metrics, null, 2));
}

/** Dumps metric json to metric json db file
 * @param metric - metric to be written to the json dump file.
 */
export function writePripelineMetrics(metric: Metric) {
	const configId = metric.configId;
	const allMetricsResult = readPipelineMetrics();
	if (allMetricsResult.isFailure) {
		return;
	}
	const allMetrics = allMetricsResult.getValue();
	const metricsForConfig = getAllPipelineMetricsForConfig(configId);
	const threshhold = 5;
	const metricsStack = new MetricStoreStack(threshhold, metricsForConfig);
	metricsStack.push(metric);

	allMetrics[configId] = metricsStack.getSequence();
	writeMetricsToFile(allMetrics);
}

/** Reads the metrics json db file and gets metric information for configured pipelines.
 */
function readPipelineMetrics(): Result<Record<string, Metric[]>> {
	if (!fs.existsSync(metricsJsonFile)) {
		fs.writeFileSync(metricsJsonFile, '{}');
	}
	try {
		const metricJsonString = fs.readFileSync(metricsJsonFile, { encoding: 'utf-8' });
		const metricJson = JSON.parse(metricJsonString) as Record<uuid, Metric[]>;
		return Result.ok(metricJson);
	} catch (error: unknown) {
		const err = error as Error;
		return Result.fail(`Failed to read pipeline metrics. ${err.name}: ${err.message}`);
	}
}

/** Returns all metrics objects that have been recorded for config with the given config Id
 * @param configId - Id for config whose recorded metrics should be found.
 */
export function getAllPipelineMetricsForConfig(configId: string) {
	const metricsResult = readPipelineMetrics();
	if (metricsResult.isFailure) {
		geoSymbolLogger({ level: LogMessageLevels.ERROR, message: metricsResult.error });
		return [];
	}
	const metricsById = metricsResult.getValue();
	const metrics = (metricsById[configId] ?? []) as Metric[];
	return metrics;
}

/** gets the most recently recorded metric for config pipeline with the given config Id
 * @param configId - Id for config whose most recent metric should be found.
 */
export function getLastPipelineMetricForConfig(configId: string) {
	const metrics = getAllPipelineMetricsForConfig(configId);
	return metrics[metrics.length - 1];
}

/** wrapper that defines the read Metric behaviour as expected by the core package.
 * use configId if provided, else return all Metrics.
 * @param configId - return recoreded metrics for given id.
 */
export function readMetricOverride(configId?: string) {
	if (configId) {
		return getLastPipelineMetricForConfig(configId);
	}
	const allPipelineMetricsResult = readPipelineMetrics();
	return allPipelineMetricsResult.isFailure ? [] : allPipelineMetricsResult.getValue();
}

/** remove metrics for given config
 * @param configId - id for pipeline whose metrics should be deleted.
 */
export function deleteMetricForConfig(configId: string) {
	const allMetricsResult = readPipelineMetrics();
	if (allMetricsResult.isFailure) {
		return allMetricsResult;
	}
	const allMetrics = allMetricsResult.getValue();
	delete allMetrics[configId];
	writeMetricsToFile(allMetrics);
}
