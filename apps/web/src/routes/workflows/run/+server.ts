import { pipelineController } from '$lib/server/appConfig';
import { error, json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const uuid = url.searchParams.get('uuid') ?? '';

	const responseResult = pipelineController.manualTriggerEvaluation(uuid);
	if (responseResult.isFailure) {
		throw error(500, responseResult.error);
	}
	return json({
		message: `${responseResult.getValue()}`
	});
}
