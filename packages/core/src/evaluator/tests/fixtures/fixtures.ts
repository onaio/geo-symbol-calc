import { Config, PriorityLevel } from '../../../helpers/types';
import form3623 from './3623-form.json';
import form3623Submissions from './3623-form-submissions.json';
import form3624Submissions from './3624-form-submissions.json';
import { defaultWriteMetric } from '../../../helpers/utils';

export { form3623, form3623Submissions, form3624Submissions };

export const apiToken = 'apiToken';
export const createConfigs = (
  loggerMock: jest.Mock,
  controller = new AbortController()
): Config => ({
  uuid: 'uuid',
  regFormId: '3623',
  visitFormId: '3624',
  symbolConfig: [
    {
      priorityLevel: PriorityLevel.VERY_HIGH,
      frequency: 3,
      symbologyOnOverflow: [
        {
          overFlowDays: 0,
          color: 'green'
        },
        {
          overFlowDays: 1,
          color: 'yellow'
        },
        {
          overFlowDays: 4,
          color: 'red'
        }
      ]
    },
    {
      priorityLevel: PriorityLevel.HIGH,
      frequency: 7,
      symbologyOnOverflow: [
        {
          overFlowDays: 0,
          color: 'green'
        },
        {
          overFlowDays: 1,
          color: 'red'
        }
      ]
    },
    {
      priorityLevel: PriorityLevel.MEDIUM,
      frequency: 14,
      symbologyOnOverflow: [
        {
          overFlowDays: 0,
          color: 'green'
        },
        {
          overFlowDays: 1,
          color: 'red'
        }
      ]
    },
    {
      priorityLevel: PriorityLevel.LOW,
      frequency: 30,
      symbologyOnOverflow: [
        {
          overFlowDays: 0,
          color: 'green'
        },
        {
          overFlowDays: 1,
          color: 'red'
        }
      ]
    }
  ],
  logger: loggerMock,
  apiToken,
  baseUrl: 'https://test-api.ona.io',
  schedule: '* * * * *',
  writeMetric: defaultWriteMetric,
  requestController: controller
});
