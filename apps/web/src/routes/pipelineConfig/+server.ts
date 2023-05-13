// send form payload to here
// get forms from here

import { localConfigFile } from '$lib/server/constants';
import fs from 'node:fs';
import { error, json } from '@sveltejs/kit';
import { getAllSymbologyConfigs } from '$lib/server/appConfig';
import { keyBy } from 'lodash-es';
import { deleteMetricForConfig } from '$lib/server/logger/configMetrics';
import {prisma} from '$lib/db'
import * as yup from 'yup';
import {configValidationSchema} from './utils'

/***
 * - add CRUD methods for working with symbolConfigs
 */

/** @type {import('./$types').RequestHandler} */
export async function GET(){
	const recs = prisma.symbolConfig.findMany()
	// TODO - 
	return json(recs)
}


/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const payload = await request.json();
	const dataText= JSON.stringify(payload);

	configValidationSchema.validate(payload).catch(err=>{
		return error(400,{message:err.message});
	})

	prisma.symbolConfig.create({
		data:{
			json:dataText,
		},
	})
	return ({});

	// const dataText = fs.readFileSync(localConfigFile);
	// const data = JSON.parse(dataText);
	// const { allSymbologyConfigs } = data;
	// const configsByUuid = keyBy(allSymbologyConfigs, 'uuid');
	// const newConfigs = {
	// 	...configsByUuid,
	// 	[payload.uuid]: payload
	// };
	// const newDataConfigs = {
	// 	...data,
	// 	allSymbologyConfigs: Object.values(newConfigs)
	// };

	// fs.writeFileSync(localConfigFile, JSON.stringify(newDataConfigs, null, 2));
	// return json({});
}

/** @type {import('./$types').RequestHandler} */
// export async function PUT({ request }) {
// 	const payload = await request.json();
// 	const dataText = fs.readFileSync(localConfigFile);
// 	const data = JSON.parse(dataText);
// 	const { allSymbologyConfigs } = data;
// 	const configsByUuid = keyBy(allSymbologyConfigs, 'uuid');
// 	const configToBeReplaced = configsByUuid[payload.uuid];
// 	const newConfigs = {
// 		...configsByUuid,
// 		[payload.uuid]: { ...payload, apiToken: configToBeReplaced.apiToken }
// 	};
// 	const newDataConfigs = {
// 		...data,
// 		allSymbologyConfigs: Object.values(newConfigs)
// 	};

// 	fs.writeFileSync(localConfigFile, JSON.stringify(newDataConfigs, null, 2));
// 	return json({});
// }
export async function PUT({request}) {
	const payload = await request.json();
	const dataText = payload.stringify();
	
	prisma.symbolConfig.update({
		where:{
			id:payload.id,
		},
		data:{
			json:dataText
		}
	})
	return json({});
	
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ url }) {
	const uuid = url.searchParams.get('uuid') ?? '';

	prisma.symbolConfig.DELETE({
		where:{
			id:uuid,
		},
	})
	// const dataText = fs.readFileSync(localConfigFile);
	// const data = JSON.parse(dataText);

	// // TODO - repeated code.
	// const allSymbologyConfigs = getAllSymbologyConfigs();
	// const leftSymbolConfigs = allSymbologyConfigs.filter((obj) => {
	// 	return obj.uuid !== uuid;
	// });

	// data.allSymbologyConfigs = leftSymbolConfigs;
	// fs.writeFileSync(localConfigFile, JSON.stringify(data, null, 2));
	// deleteMetricForConfig(uuid);
	return json({});
}

export const prerender = false;
