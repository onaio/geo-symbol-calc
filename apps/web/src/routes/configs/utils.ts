import * as yup from 'yup';
import { v4 } from 'uuid';
import type { WebConfig } from '$lib/shared/types';

// TODO - dry out - duplicate in package core.
export enum PriorityLevel {
	VERY_HIGH = 'Very_High',
	HIGH = 'High',
	MEDIUM = 'Medium',
	LOW = 'Low'
}

export interface FormFields {
	uuid: string;
	baseUrl: string;
	regFormId: string;
	visitFormId: string;
	apiToken?: string;
	symbolConfig: {
		priorityLevel?: PriorityLevel;
		frequency?: number;
		symbologyOnOverflow: { overFlowDays?: number; color?: string }[];
	}[];
	schedule: string;
}

export const defaultColorCodeFormValues = { overFlowDays: undefined, color: undefined };
export const defaultColorcodeErrorValue = { overFlowDays: undefined, color: undefined };
export const defaultPriorityFormValues = {
	priorityLevel: PriorityLevel.VERY_HIGH,
	frequency: 0,
	symbologyOnOverflow: [{ ...defaultColorCodeFormValues }]
};
export const defaultPriorityErrorValues = {
	priorityLevel: undefined,
	frequency: undefined,
	symbologyOnOverflow: [{ ...defaultColorcodeErrorValue }]
};

export const initialValues: FormFields = {
	uuid: '',
	baseUrl: '',
	regFormId: '',
	visitFormId: '',
	apiToken: '<Replace token here>',
	symbolConfig: [defaultPriorityFormValues],
	schedule: ''
};

export const configValidationSchema = yup.object().shape({
	uuid: yup.string(),
	baseUrl: yup.string().required('Base Url is required'),
	regFormId: yup.string().required('Geo point registration form is required'),
	visitFormId: yup.string().required('Visit form field is required'),
	symbolConfig: yup
		.array()
		.of(
			yup.object().shape({
				priorityLevel: yup.string().oneOf(Object.values(PriorityLevel)),
				frequency: yup.number().required('Frequencey is required'),
				symbologyOnOverflow: yup.array().of(
					yup.object().shape({
						overFlowDays: yup.number().required('Over flow days is required'),
						color: yup.string().required('Color code is required.')
					})
				)
			})
		)
		.ensure()
		.min(1),
	schedule: yup
		.string()
		.test('schedule', 'Schedule is not valid cron syntax', async function (value?: string) {
			const res = await fetch('/configs/validate', {
				method: 'POST',
				body: JSON.stringify({
					schedule: value
				})
			});
			return await res
				.json()
				.then((body) => {
					if (body.valid) {
						return true;
					}
					throw Error('Invalid Error: Validation request failed');
				})
				.catch(() => {
					return false;
				});
		})
});

export const generateFilledData = (formFields: FormFields) => {
	const { baseUrl, regFormId, visitFormId, apiToken, symbolConfig, schedule, uuid } = formFields;
	return {
		baseUrl,
		regFormId,
		visitFormId,
		apiToken,
		symbolConfig,
		schedule,
		uuid: uuid ? uuid : v4()
	};
};

export const getInitialValues = (data?: WebConfig): FormFields => {
	if (data) {
		return {
			uuid: data.uuid,
			baseUrl: data.baseUrl,
			regFormId: data.regFormId,
			visitFormId: data.visitFormId,
			apiToken: '<Replace with api token>',
			symbolConfig: data.symbolConfig.map((config) => {
				return {
					...config,
					symbologyOnOverflow: config.symbologyOnOverflow.map((symbology) => {
						return { ...symbology, color: standardize_color(symbology.color) };
					})
				};
			}),
			schedule: data.schedule
		};
	}
	return initialValues;
};

export function standardize_color(str: string) {
	const ctx = document.createElement('canvas').getContext('2d');
	if (ctx) {
		ctx.fillStyle = str;
		return ctx.fillStyle;
	}
	return '';
}
