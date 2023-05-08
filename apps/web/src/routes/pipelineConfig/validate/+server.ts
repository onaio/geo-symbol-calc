import { configValidationSchema } from '@onaio/symbology-calc-core';

/** @type {import('./$types').RequestHandler} */
export function POST({ request }) {
	return request.json().then((body) => {
		try {
			configValidationSchema.fields.schedule.validateSync(body.schedule);
		} catch (err: Error) {
			const { errors } = err;
			return new Response(JSON.stringify({ isValid: false, errors }));
		}
		return new Response(JSON.stringify({ valid: true, erors: null }));
	});
}
