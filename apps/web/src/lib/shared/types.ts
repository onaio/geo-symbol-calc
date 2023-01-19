import type { Config } from '@onaio/symbology-calc-core';

export interface WebConfig extends Config {
	uuid: string;
}

export type SingleApiSymbolConfig = WebConfig;

export type ClientSideSingleSymbolConfig = Pick<
	Config,
	'baseUrl' | 'visitFormId' | 'regFormId' | 'symbolConfig' | 'schedule'
>;
