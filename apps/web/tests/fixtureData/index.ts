export const createdConfig1 = {
	baseUrl: 'https://stage-api.ona.io',
	formPair: {
		regFormId: '01',
		visitFormId: '02'
	},
	apiToken: '<Replace with api token>',
	symbolConfig: [
		{
			symbologyOnOverflow: [
				{
					color: '#1eff00',
					overFlowDays: '1'
				},
				{
					overFlowDays: '3',
					color: '#fcdb03'
				}
			],
			priorityLevel: 'Very_High',
			frequency: '3'
		},
		{
			priorityLevel: 'Medium',
			frequency: '10',
			symbologyOnOverflow: [
				{
					overFlowDays: '0'
				}
			]
		}
	],
	schedule: '*/5 * * * *'
};
