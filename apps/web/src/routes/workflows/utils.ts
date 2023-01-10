import type { ClientSideSingleSymbolConfig } from '$lib/shared/types';
import cronstrue from 'cronstrue';

export function parseForTable(singleConfig: ClientSideSingleSymbolConfig) {
	const tableHeaders = [
		'Priority Level',
		'Required visits frequency (days)',
		'# days passed required visit'
	];
	const tableRows: (string | number | [number, string])[][] = [];
	let colorsColSpan = 0;
	(singleConfig.symbolConfig ?? []).forEach(
		({ priorityLevel, frequency, symbologyOnOverflow }, index) => {
			if (tableRows[index] === undefined) {
				tableRows[index] = [];
			}
			const symbologyOnOverFlow = symbologyOnOverflow.slice() ?? [];
			// sort in ascending order
			tableRows[index].push(priorityLevel);
			tableRows[index].push(frequency);
			const orderedSymbologyOnOverflow = symbologyOnOverFlow.sort(
				(a, b) => a.overFlowDays - b.overFlowDays
			);
			orderedSymbologyOnOverflow.forEach(({ overFlowDays, color }, idx) => {
				tableRows[index].push([overFlowDays, color]);
				const span = idx + 1;
				if (span > colorsColSpan) {
					colorsColSpan = span;
				}
			});
		}
	);

	return { tableHeaders, tableRows, colorsColSpan };
}

/** Converts a cron syntax string to huma readable string
 * @param cronString - cron-like syntax string.
 */
export function convertCronToHuman(cronString: string) {
	const cronstrueOptions = {
		verbose: true,
		use24HourTimeFormat: true
	};
	try {
		return cronstrue.toString(cronString, cronstrueOptions);
	} catch (err) {
		return '';
	}
}

/** creates a human readable date time string
 * @param timeStamp - time as timestamp to be converted.
 */
export function formatTimestamp(timeStamp: number) {
	return new Date(timeStamp).toLocaleString();
}
