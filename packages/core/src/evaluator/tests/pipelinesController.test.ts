import {
  editSubmissionEndpoint,
  facilityOnVisitFormAcccessor,
  formEndpoint,
  submittedDataEndpoint
} from '../../constants';
import { ConfigRunner } from '../configRunner';
import { PipelinesController } from '../pipelinesController';
import {
  createConfigs,
  form3623,
  form3623Submissions,
  form3624Submissions
} from './fixtures/fixtures';

const scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout;

function flushPromises() {
  return new Promise(function (resolve) {
    scheduler(resolve);
  });
}

const jestConsole = console;

beforeEach(() => {
  global.console = require('console');
});

afterEach(() => {
  global.console = jestConsole;
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nock = require('nock');

const mockV4 = '0af4f147-d5fd-486a-bf76-d1bf850cc976';

jest.mock('uuid', () => {
  const v4 = () => mockV4;
  return { __esModule: true, ...jest.requireActual('uuid'), v4 };
});

jest.mock('node-cron', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    schedule: (cronString: string, _callback: () => unknown) => {
      return `task-${cronString}`;
    },
    validate: () => true
  };
});

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});

it('works correctly nominal case', async () => {
  const loggerMock = jest.fn();
  const configs = createConfigs(loggerMock);

  // mock fetched firstform
  nock(configs.baseUrl).get(`/${formEndpoint}/3623`).reply(200, form3623);

  // mock getting submissions for each of first form submissions
  nock(configs.baseUrl)
    .get(`/${submittedDataEndpoint}/3623`)
    .query({ page_size: 1000, page: 1 })
    .reply(200, form3623Submissions);

  form3623Submissions.forEach((submission) => {
    const facilityId = submission._id;

    // get form2 submissions that relate to this form one submission
    nock(configs.baseUrl)
      .get(`/${submittedDataEndpoint}/3624`)
      .query({
        page_size: 1,
        page: 1,
        query: `{"${facilityOnVisitFormAcccessor}": ${facilityId}}`,
        sort: '{"endtime": -1}'
      })
      .reply(
        200,
        form3624Submissions.filter((sub) => `${sub.facility}` === `${submission._id}`)
      );

    const submissionsWithValidPost = [
      304870, 304871, 304872, 304873, 304874, 304889, 304890, 304892
    ];
    if (!submissionsWithValidPost.includes(facilityId)) {
      return;
    }

    nock(configs.baseUrl)
      .post(`/${editSubmissionEndpoint}`, {
        id: '3623',
        submission: {
          ...submission,
          'marker-color': 'red',
          meta: {
            instanceID: 'uuid:0af4f147-d5fd-486a-bf76-d1bf850cc976',
            deprecatedID: submission['meta/instanceID']
          }
        }
      })
      .reply(201, {
        message: 'Successful submission.',
        formid: 'cameroon_iss_registration_v2_1'
        // ...
      });
  });

  const pipelinesController = new PipelinesController(() => [configs]);
  expect(pipelinesController.getPipelines()).toMatchObject({});
  expect(pipelinesController.getTasks()).toMatchObject({});

  pipelinesController.runOnSchedule();
  expect(pipelinesController.getPipelines()).toMatchObject({});
  expect(pipelinesController.getTasks()).toMatchObject({});

  pipelinesController.cancelPipelines();
  expect(pipelinesController.getPipelines()).toMatchObject({});
  expect(pipelinesController.getTasks()).toMatchObject({});

  expect(loggerMock.mock.calls).toEqual([]);
  const configRunner = pipelinesController.getPipelines(configs.uuid);
  const runner = configRunner as ConfigRunner;
  expect(runner.isRunning()).toBeFalsy();
  expect(runner.isValid()).toBeTruthy();
  const response = runner.transform();
  expect(runner.isRunning()).toBeTruthy();
  const metric = await response;

  expect(runner.isRunning()).toBeFalsy();
  // expect(loggerMock.mock.calls).toEqual(logCalls);
  expect(metric.getValue()).toEqual({
    configId: 'uuid',
    facilitiesEvaluated: {
      modified: { red: 8, total: 8 },
      notModified: {
        ECODE2: { description: 'Facility does not have a priority level', total: 2 },
        total: 2
      },
      total: 10
    },
    facilitiesNotEvaluated: { total: 0 },
    totalFacilities: 10,
    totalFacilitiesEvaluated: 10,
    trigger: { by: 'schedule', from: 1673275673342, to: 1673275673342, tookMills: 0 }
  });

  await flushPromises();
  expect(nock.pendingMocks()).toEqual([]);
});

it('error when fetching the registration form', async () => {
  const loggerMock = jest.fn();
  const configs = createConfigs(loggerMock);

  // mock fetched firstform
  nock(configs.baseUrl).get(`/${formEndpoint}/3623`).reply(400, 'Could not find form with id');

  const pipelinesController = new PipelinesController(() => [configs]);
  const configRunner = pipelinesController.getPipelines(configs.uuid) as ConfigRunner;
  const runner = configRunner as ConfigRunner;
  await runner.transform().catch((err) => {
    throw err;
  });
  expect(configRunner.isRunning()).toBeFalsy();
  expect(loggerMock.mock.calls).toEqual([
    [
      {
        level: 'error',
        message:
          'Operation to fetch form: 3623, failed with err: Error: 400: Could not find form with id: Network request failed.'
      }
    ]
  ]);

  expect(nock.pendingMocks()).toEqual([]);
});

test('updates configs from empty configs', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let startingConfigs: any[] = [[]];
  const pipelinesController = new PipelinesController(() => startingConfigs[0]);

  expect(pipelinesController.getPipelines()).toEqual([]);
  expect(pipelinesController.getTasks()).toEqual([]);

  const sampleConfig = {
    baseUrl: 'https://stage-api.ona.io',
    regFormId: '3623',
    visitFormId: '3624',
    apiToken: '<Replace with api token>',
    symbolConfig: [
      {
        priorityLevel: 'Very_High',
        frequency: '8',
        symbologyOnOverflow: [
          {
            overFlowDays: '3',
            color: '#ff0000'
          }
        ]
      }
    ],
    schedule: '0 5 */7 * *',
    uuid: 'fcbae261-780d-4fd5-abcf-766f51af085e'
  };

  startingConfigs = [[sampleConfig]];

  pipelinesController.refreshConfigRunners();
  expect(pipelinesController.getPipelines()).toMatchObject([expect.any(ConfigRunner)]);
  expect(pipelinesController.getTasks()).toHaveLength(1);
});

// can cancel evaluation.
