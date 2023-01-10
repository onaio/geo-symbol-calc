import fs from 'node:fs';
import path from 'node:path';

// TODO - use of any - should be: import type { FullConfig } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function globalTearDown(config: any) {
	const configDir = config.webServer.env.NODE_CONFIG_DIR;
	const localJsonRestingValue = {
		errorLogFilePath: '',
		combinedLogFilePath: '',
		allSymbologyConfigs: []
	};
	const localJsonFileName = 'local.json';
	const metricsJsonFileName = 'metrics.json';

	const localJsonPath = path.resolve(configDir, localJsonFileName);
	const metricsJsonPath = path.resolve(configDir, metricsJsonFileName);

	fs.writeFileSync(localJsonPath, JSON.stringify(localJsonRestingValue, null, 2));
	// remove metrics.json
	fs.unlinkSync(metricsJsonPath);
}

export default globalTearDown;
