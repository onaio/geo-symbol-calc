import type { ClientSideSingleSymbolConfig } from '$lib/shared/types';

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

/** creates a human readable date time string
 * @param timeStamp - time as timestamp to be converted.
 */
export function formatTimestamp(timeStamp: number) {
	return new Date(timeStamp).toLocaleString();
}


export function formatTriggerDuration(start?: number, end?: number, isRunning=false){
	if (start && end){
		return `${formatTimestamp(start)}  to  ${formatTimestamp(end)} (${((end - start) / 60000).toFixed(0)} mins)`
	}
	if(!start){
		return `Unable to determine when pipeline was started`
	}
	if(!end){
		if(isRunning){
			const runningFor = ((Date.now() - start) / 60000).toFixed(0)
			return `Started at: ${formatTimestamp(start)}; (Running for ${runningFor} mins)`
		}
		else{
			return `Started at: ${formatTimestamp(start)}; (Ran cancelled before completion)`
		}
	}
}