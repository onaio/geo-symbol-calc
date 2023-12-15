import cronstrue from 'cronstrue';


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
