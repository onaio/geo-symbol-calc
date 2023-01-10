import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		env: {
			NODE_CONFIG_DIR: './tests/mockConfigDir'
		},
		command: 'npm run build && npm run preview',
		port: 4173
	},
	use: {
		baseURL: 'http://localhost:4173/'
	},
	globalTeardown: './global-tearDown'
};

export default config;
