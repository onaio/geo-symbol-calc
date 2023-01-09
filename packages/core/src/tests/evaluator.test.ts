import { editSubmissionEndpoint, formEndpoint, submittedDataEndpoint } from '../constants';
import { evaluate } from '../evaluator';
import { evaluatingTasks } from '../utils';
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

  expect(evaluatingTasks).toEqual({});
  const promiseToEvaluate = evaluate(configs).catch((err) => {
    throw err;
  });

  expect(Object.entries(evaluatingTasks)).toHaveLength(0);
  expect(evaluatingTasks['uuid']).toBeUndefined();
  await promiseToEvaluate;

  expect(evaluatingTasks).toEqual({
    uuid: {
      configId: 'uuid',
      endTime: 1673275673342,
      evaluated: 10,
      modified: 8,
      notModdifiedDueError: 0,
      notModifiedWithoutError: 0,
      startTime: 1673275673342
    }
  });

  expect(loggerMock.mock.calls).toEqual(logCalls);

  expect(nock.pendingMocks()).toEqual([]);
});

it('error when fetching the registration form', async () => {
  const loggerMock = jest.fn();
  const configs = createConfigs(loggerMock);

  // mock fetched firstform
  nock(configs.baseUrl).get(`/${formEndpoint}/3623`).replyWithError('Could not find form with id');

  await evaluate(configs).catch((err) => {
    throw err;
  });

  expect(loggerMock.mock.calls).toEqual([
    [
      {
        level: 'error',
        message:
          'Operation to fetch form: 3623, failed with err: FetchError: request to https://test-api.ona.io/api/v1/forms/3623 failed, reason: Could not find form with id'
      }
    ]
  ]);

  expect(nock.pendingMocks()).toEqual([]);
});

it('error when fetching the submission on the reg form', async () => {
  const loggerMock = jest.fn();
  const configs = createConfigs(loggerMock);

  // mock fetched firstform
  nock(configs.baseUrl).get(`/${formEndpoint}/3623`).reply(200, form3623);

  // mock getting submissions for each of first form submissions
  nock(configs.baseUrl)
    .get(`/${submittedDataEndpoint}/3623`)
    .query({ page_size: 1000, page: 1 })
    .replyWithError('Could not find submissions');

  await evaluate(configs).catch((err) => {
    throw err;
  });

  expect(loggerMock.mock.calls).toEqual([
    [
      {
        level: 'verbose',
        message: 'Fetched form wih form id: 3623'
      }
    ],
    [
      {
        level: 'error',
        message:
          'Unable to fetch submissions for form id: 3623 page: https://test-api.ona.io/api/v1/data/3623?page_size=1000&page=1 with err : request to https://test-api.ona.io/api/v1/data/3623?page_size=1000&page=1 failed, reason: Could not find submissions'
      }
    ],
    [
      {
        level: 'info',
        message: 'Finished form pair {regFormId: 3623, visitFormId: 3624}'
      }
    ]
  ]);

  expect(nock.pendingMocks()).toEqual([]);
});

it('can cancel evaluation', async () => {
  const loggerMock = jest.fn();
  const controller = new AbortController();
  const baseConfigs = createConfigs(loggerMock, controller);
  const configs = {
    ...baseConfigs,
    uuid: 'uuid1'
  };

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

  const promiseToEvaluate = evaluate(configs).catch((err) => {
    throw err;
  });
  controller.abort();
  await promiseToEvaluate;

  expect(evaluatingTasks['uuid1']).toEqual({
    configId: 'uuid1',
    endTime: 1673275673342,
    evaluated: 0,
    modified: 0,
    notModdifiedDueError: 0,
    notModifiedWithoutError: 0,
    startTime: 1673275673342
  });

  expect(loggerMock.mock.calls).toEqual([
    [
      {
        level: 'error',
        message:
          'Operation to fetch form: 3623, failed with err: AbortError: The user aborted a request.'
      }
    ]
  ]);

  expect(nock.pendingMocks().length).toBeGreaterThan(4);
});
