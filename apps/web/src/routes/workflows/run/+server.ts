import { error, json } from '@sveltejs/kit';
import { getAllSymbologyConfigs } from '$lib/server/appConfig';
import { keyBy } from 'lodash-es';
import { evaluate, type Config, isPipelineRunning } from '@onaio/symbology-calc-core';
import { getLastPipelineMetricForConfig } from '$lib/server/logger/configMetrics';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const uuid = url.searchParams.get('uuid') ?? '';

	const similarTask = getLastPipelineMetricForConfig(uuid);
	const taskIsRunning = isPipelineRunning(similarTask);
	if (taskIsRunning) {
		return json({ message: 'Pipeline is already running' });
	}

	const associatedConfigs: Record<string, Config> = keyBy(getAllSymbologyConfigs(), 'uuid');

	const configOfInterest = associatedConfigs[uuid];
	console.log(JSON.stringify(configOfInterest));
	if (!configOfInterest) {
		throw error(
			500,
			'Oops, something went wrong while trying to load configuration for this pipeline'
		);
	}

	evaluate(configOfInterest);
	return json({
		message: 'Pipeline triggered asynchronously, This pipeline will run in the background.'
	});
}
