import { createLogger, transports, format } from 'winston';
import type { LogFn } from '@onaio/symbology-calc-core';
import { getConfig } from '../appConfig/utils';
import { combinedLogFilePathAccessor, errorLogFilePathAccessor } from '../constants';

const loggerFormatFn = () =>
	format.printf((info) => `: ${[info.timestamp]}: ${info.level}: ${info.message}`);

const errorLogFilePath = getConfig(errorLogFilePathAccessor, '') as string;
const combinedLogFilePath = getConfig(combinedLogFilePathAccessor, '') as string;

const logger = createLogger({
	transports: [
		new transports.Console({
			level: 'silly'
		})
	],
	// handle Uncaught Exceptions
	handleExceptions: true,
	// do not exit on handled exceptions
	exitOnError: false,
	// custom log format
	format: format.combine(
		format.timestamp({
			format: 'MMM-DD-YYYY HH:mm:ss'
		}),
		loggerFormatFn()
	)
});

if (errorLogFilePath) {
	logger.add(
		new transports.File({
			level: 'error',
			filename: errorLogFilePath
		})
	);
}

if (combinedLogFilePath) {
	logger.add(
		new transports.File({
			filename: combinedLogFilePath,
			level: 'verbose'
		})
	);
}

const geoSymbolLogger: LogFn = (messageObj) => {
	const { message, level } = messageObj;
	logger.log(level, message);
};

export { logger, geoSymbolLogger };
