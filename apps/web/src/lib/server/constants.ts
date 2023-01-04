import { resolve } from 'node:path';
import { allSymbolConfigsAccessor } from '$lib/shared/constants';

// TODO - hack: the folders and mungled up during build thus making the relative urls not consistently during dev and production.
const defaultConfigDir = new URL(
	import.meta.env.PROD ? '../../../../../web/config' : '../../../../../apps/web/config',
	import.meta.url
).pathname;

export const configDir = process.env['NODE_CONFIG_DIR'] ?? defaultConfigDir; // TODO - should we check that local.json is provided as an invariant.
export const defaultConfigFile = resolve(configDir, 'default.json');
export const localConfigFile = resolve(configDir, 'local.json');
export const metricsJsonFile = resolve(configDir, 'metrics.json');

// magic strings
export const errorLogFilePathAccessor = 'errorLogFilePath' as const;
export const combinedLogFilePathAccessor = 'combinedLogFilePath' as const;

export { allSymbolConfigsAccessor };
