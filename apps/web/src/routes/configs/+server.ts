// send form payload to here
// get forms from here

import { localConfigFile } from '$lib/server/constants';
import fs from 'node:fs';
import { json } from '@sveltejs/kit';
import { getAllSymbologyConfigs } from '$lib/server/appConfig';
import { keyBy } from 'lodash-es';
import { deleteMetricForConfig } from '$lib/server/logger/configMetrics';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const payload = await request.json();
	const dataText = fs.readFileSync(localConfigFile);
	const data = JSON.parse(dataText);
	const { allSymbologyConfigs } = data;
	const configsByUuid = keyBy(allSymbologyConfigs, 'uuid');
	const newConfigs = {
		...configsByUuid,
		[payload.uuid]: payload
	};
	const newDataConfigs = {
		...data,
		allSymbologyConfigs: Object.values(newConfigs)
	};

	fs.writeFileSync(localConfigFile, JSON.stringify(newDataConfigs, null, 2));
	return json({});
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	const payload = await request.json();
	const dataText = fs.readFileSync(localConfigFile);
	const data = JSON.parse(dataText);
	const { allSymbologyConfigs } = data;
	const configsByUuid = keyBy(allSymbologyConfigs, 'uuid');
	const configToBeReplaced = configsByUuid[payload.uuid];
	const newConfigs = {
		...configsByUuid,
		[payload.uuid]: { ...payload, apiToken: configToBeReplaced.apiToken }
	};
	console.log({ newConfigs }, configToBeReplaced.apiToken);
	const newDataConfigs = {
		...data,
		allSymbologyConfigs: Object.values(newConfigs)
	};

	fs.writeFileSync(localConfigFile, JSON.stringify(newDataConfigs, null, 2));
	return json({});
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ url }) {
	const uuid = url.searchParams.get('uuid') ?? '';

	const dataText = fs.readFileSync(localConfigFile);
	const data = JSON.parse(dataText);

	// TODO - repeated code.
	const allSymbologyConfigs = getAllSymbologyConfigs();
	const leftSymbolConfigs = allSymbologyConfigs.filter((obj) => {
		return obj.uuid !== uuid;
	});

	data.allSymbologyConfigs = leftSymbolConfigs;
	fs.writeFileSync(localConfigFile, JSON.stringify(data, null, 2));
	deleteMetricForConfig(uuid);
	return json({});
}

export const prerender = false;
