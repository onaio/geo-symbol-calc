import { getClientSideSymbologyConfigs } from '$lib/server/appConfig';
import { keyBy } from 'lodash-es';

/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	const uuid = url.searchParams.get('uuid') ?? '';

	if (!uuid) {
		return { config: null };
	}
	const clientSymbologyConfigs = getClientSideSymbologyConfigs();

	const configsByKeys = keyBy(clientSymbologyConfigs, 'uuid');
	const configOfInterest = configsByKeys[uuid];
	return { config: configOfInterest ?? null };
}
