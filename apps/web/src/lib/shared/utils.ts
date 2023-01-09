import type { Metric } from '@onaio/symbology-calc-core';

// TODO - Dry this out. Repeated in package core. We cannot just re-use the one in package core
// since it does not work on the browser, it also import some code that are only meant to run on
// node runtime.
export function isPipelineRunning(metric: Metric) {
	if (metric) {
		const endDate = metric.endTime;
		if (endDate !== null) {
			//  if endDate is after startTime then we can assume its not running.
			if (endDate - metric.startTime >= 0) {
				return false;
			}
		}
	} else {
		return false;
	}
	return true;
}
