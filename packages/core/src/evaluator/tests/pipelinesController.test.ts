import { editSubmissionEndpoint, formEndpoint, submittedDataEndpoint } from '../../constants';
import { ConfigRunner } from '../configRunner';
import { PipelinesController } from '../pipelinesController';
import {
  createConfigs,
  form3623,
  form3623Submissions,
  form3624Submissions
} from './fixtures/fixtures';
import { logCalls } from './fixtures/logCalls';

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
    }
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
        query: `{"facility": ${facilityId}}`,
        sort: '{"date_of_visit": -1}'
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

  pipelinesController.evaluateOnSchedule();
  expect(pipelinesController.getPipelines()).toMatchObject({});
  expect(pipelinesController.getTasks()).toMatchObject({});

  pipelinesController.cancel();
  expect(pipelinesController.getPipelines()).toMatchObject({});
  expect(pipelinesController.getTasks()).toMatchObject({});

  expect(loggerMock.mock.calls).toEqual([]);
  const configRunner = pipelinesController.getPipelines(configs.uuid);
  const runner = configRunner as ConfigRunner;
  expect(runner.isRunning()).toBeFalsy();
  const response = runner.transform();
  expect(runner.isRunning()).toBeTruthy();
  const metric = await response;
  console.log({ configRunner });
  expect(runner.isRunning()).toBeFalsy();
  expect(loggerMock.mock.calls).toEqual(logCalls);
  expect(metric.getValue()).toEqual({
    configId: 'uuid',
    endTime: 1673275673342,
    evaluated: 10,
    modified: 8,
    notModifiedWithError: 2,
    notModifiedWithoutError: 0,
    startTime: 1673275673342,
    totalSubmissions: 10
  });

  expect(nock.pendingMocks()).toEqual([]);
});

it('error when fetching the registration form', async () => {
  const loggerMock = jest.fn();
  const configs = createConfigs(loggerMock);

  // mock fetched firstform
  nock(configs.baseUrl).get(`/${formEndpoint}/3623`).replyWithError('Could not find form with id');

  const pipelinesController = new PipelinesController(() => [configs]);
  const configRunner = pipelinesController.getPipelines(configs.uuid);
  const runner = configRunner as ConfigRunner;
  await runner.transform().catch((err) => {
    throw err;
  });

  expect(loggerMock.mock.calls).toEqual([
    [
      {
        level: 'error',
        message:
          'Operation to fetch form: 3623, failed with err: Error: system: FetchError: request to https://test-api.ona.io/api/v1/forms/3623 failed, reason: Could not find form with id.'
      }
    ]
  ]);

  expect(nock.pendingMocks()).toEqual([]);
});

// can cancel evaluation.
