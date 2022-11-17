import { error, json } from '@sveltejs/kit';
import { getAllSymbologyConfigs } from '$lib/server/appConfig';
import { keyBy } from 'lodash-es';
import { evaluate, type Config, evaluatingTasks } from '@onaio/symbology-calc-core';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const uuid = url.searchParams.get('uuid') ?? '';

	const similarTask = evaluatingTasks[uuid];
	if (similarTask !== undefined) {
		return json({ message: 'Pipeline is already running' });
	}

	const associatedConfigs: Record<string, Config> = keyBy(getAllSymbologyConfigs(), 'uuid');

	const configOfInterest = associatedConfigs[uuid];
	if (!configOfInterest) {
		throw error(500, 'Oops, something went wrong while trying to load config');
	}

	evaluate(configOfInterest);
	return json({
		message: 'Pipeline triggered asynchronously, This pipeline will run in the backgournd'
	});
}
