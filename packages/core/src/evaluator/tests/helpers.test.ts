import { OnaApiService } from '../../services/onaApi/services';
import { createConfigs, form3623Submissions } from './fixtures/fixtures';
import { transformFacility, createMetricFactory } from '../helpers/utils';
import { colorDeciderFactory } from '../../helpers/utils';
import {
  dateOfVisitAccessor,
  editSubmissionEndpoint,
  submittedDataEndpoint
} from '../../constants';
import { RegFormSubmission } from '../../helpers/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nock = require('nock');

const mockV4 = '0af4f147-d5fd-486a-bf76-d1bf850cc976';

jest.mock('uuid', () => {
  const v4 = () => mockV4;
  return { __esModule: true, ...jest.requireActual('uuid'), v4 };
});

test('creates metrics correctly', () => {
  const creator = createMetricFactory(0, 'uuid');
  expect(creator(0, 0, 0, 0, 0)).toEqual({
    configId: 'uuid',
    endTime: null,
    evaluated: 0,
    modified: 0,
    notModifiedWithError: 0,
    notModifiedWithoutError: 0,
    startTime: 0,
    totalSubmissions: 0
  });
});

/**
 * FAQ: Tests taking too long till they timeout.
 *  OnaApiService uses a customFetch that has
 *  exponential backoff for failing requets.
 */

describe('transform facility tests', () => {
  const baseUrl = 'http://sample.com';
  const regFormId = '3623',
    visitFormId = '3624';
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('transform facility works correctly for nominal cases', async () => {
    const apiToken = 'apiToken';
    const logger = jest.fn();
    const service = new OnaApiService(baseUrl, apiToken, logger);
    const config = createConfigs(logger);
    const colorDecider = colorDeciderFactory(config.symbolConfig, logger);
    const regFomSubmission = {
      ...form3623Submissions[0]
    } as RegFormSubmission;
    // mock getting submissions for each of first form submissions
    nock(baseUrl)
      .get(`/${submittedDataEndpoint}/3624`)
      .query({
        page_size: 1,
        page: 1,
        query: `{"facility": ${regFomSubmission._id}}`, // filter visit submissions for this facility
        sort: `{"${dateOfVisitAccessor}": -1}`
      })
      .reply(200, [{ [dateOfVisitAccessor]: '2023-01-08' }]);

    nock(baseUrl)
      .post(`/${editSubmissionEndpoint}`, {
        id: '3623',
        submission: {
          ...regFomSubmission,
          'marker-color': 'green',
          meta: {
            instanceID: 'uuid:0af4f147-d5fd-486a-bf76-d1bf850cc976',
            deprecatedID: regFomSubmission['meta/instanceID']
          }
        }
      })
      .reply(201, {
        message: 'Successful submission.',
        formid: 'cameroon_iss_registration_v2_1'
        // ...
      });

    const response = await transformFacility(
      service,
      regFomSubmission,
      regFormId,
      visitFormId,
      colorDecider,
      logger
    );

    expect(response).toEqual({
      error: null,
      modified: true
    });
  });

  it('error when fetching submissions for facility', async () => {
    const apiToken = 'apiToken';
    const logger = jest.fn();
    const service = new OnaApiService(baseUrl, apiToken, logger);
    const config = createConfigs(logger);
    const colorDecider = colorDeciderFactory(config.symbolConfig, logger);
    const regFomSubmission = {
      ...form3623Submissions[0]
    } as RegFormSubmission;
    // mock getting submissions for each of first form submissions
    nock(baseUrl)
      .get(`/${submittedDataEndpoint}/3624`)
      .query({
        page_size: 1,
        page: 1,
        query: `{"facility": ${regFomSubmission._id}}`, // filter visit submissions for this facility
        sort: `{"${dateOfVisitAccessor}": -1}`
      })
      .reply(502, { message: 'error' });

    // after attempt
    nock(baseUrl)
      .get(`/${submittedDataEndpoint}/3624`)
      .query({
        page_size: 1,
        page: 1,
        query: `{"facility": ${regFomSubmission._id}}`, // filter visit submissions for this facility
        sort: `{"${dateOfVisitAccessor}": -1}`
      })
      .reply(400, { message: 'error' });

    nock(baseUrl)
      .post(`/${editSubmissionEndpoint}`, {
        id: '3623',
        submission: {
          ...regFomSubmission,
          'marker-color': 'green',
          meta: {
            instanceID: 'uuid:0af4f147-d5fd-486a-bf76-d1bf850cc976',
            deprecatedID: regFomSubmission['meta/instanceID']
          }
        }
      })
      .reply(201, {
        message: 'Successful submission.',
        formid: 'cameroon_iss_registration_v2_1'
        // ...
      });

    const response = await transformFacility(
      service,
      regFomSubmission,
      regFormId,
      visitFormId,
      colorDecider,
      logger
    );

    expect(response.modified).toBeFalsy();
    console.log(typeof response.error);
    expect(response.error).toEqual('400: {"message":"error"}: Network request failed.');
  });

  it('cancelling request works', async () => {
    const apiToken = 'apiToken';
    const logger = jest.fn();
    const controller = new AbortController();
    const service = new OnaApiService(baseUrl, apiToken, logger, controller);
    const config = createConfigs(logger);
    const colorDecider = colorDeciderFactory(config.symbolConfig, logger);
    const regFomSubmission = {
      ...form3623Submissions[0]
    } as RegFormSubmission;
    // mock getting submissions for each of first form submissions
    nock(baseUrl)
      .get(`/${submittedDataEndpoint}/3624`)
      .query({
        page_size: 1,
        page: 1,
        query: `{"facility": ${regFomSubmission._id}}`, // filter visit submissions for this facility
        sort: `{"${dateOfVisitAccessor}": -1}`
      })
      .reply(200, [{ [dateOfVisitAccessor]: '2023-01-08' }]);

    nock(baseUrl)
      .post(`/${editSubmissionEndpoint}`, {
        id: '3623',
        submission: {
          ...regFomSubmission,
          'marker-color': 'green',
          meta: {
            instanceID: 'uuid:0af4f147-d5fd-486a-bf76-d1bf850cc976',
            deprecatedID: regFomSubmission['meta/instanceID']
          }
        }
      })
      .reply(201, {
        message: 'Successful submission.',
        formid: 'cameroon_iss_registration_v2_1'
        // ...
      });

    const response = transformFacility(
      service,
      regFomSubmission,
      regFormId,
      visitFormId,
      colorDecider,
      logger
    );

    controller.abort();
    await response.then((value) => {
      expect(value).toEqual({
        error: 'aborted: AbortError: The user aborted a request..',
        modified: false
      });
    });
  });
});
