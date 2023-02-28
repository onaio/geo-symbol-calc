import { flatMap } from 'lodash-es';
import {
  editSubmissionEndpoint,
  formEndpoint,
  markerColorAccessor,
  submittedDataEndpoint
} from '../../constants';
import { v4 } from 'uuid';
import { BaseFormSubmission, Color, Form, LogFn, RegFormSubmission } from '../../helpers/types';
import { createErrorLog, createInfoLog, createVerboseLog } from '../../helpers/utils';
import fetchRetry, { RequestInitWithRetry } from 'fetch-retry';
import { Result } from '../../helpers/Result';

const persistentFetch = fetchRetry(fetch);

/** Wrapper around the default fetch function. Adds a retyr mechanism based on exponential backof
 * @param input - url or a request object representing the request to be made
 * @param init - fetch options.
 */
export const customFetch = async (input: RequestInfo, init?: RequestInit, logger?: LogFn) => {
  // The exponential backoff strategy can be hardcoded, should it be left to the calling function.
  // post requests are not idempotent
  const numOfRetries = 10;
  const delayConstant = 500; //ms
  const requestOptionsWithRetry: RequestInitWithRetry = {
    ...init,
    retries: numOfRetries,
    retryOn: function (_, error, response) {
      let retry = false;
      const method = init?.method ?? 'GET';
      if (error) {
        retry = method === 'GET';
      }
      if (response) {
        const status = response?.status;
        // retry on all server side error http codes.
        retry = status >= 500 && status < 600;
      }

      if (retry) {
        const msg = response
          ? `Retrying request; request respondend with status: ${response?.status}`
          : 'Retrying request, Request does not have a response';
        logger?.(createVerboseLog(msg));
      }
      return retry;
    },
    retryDelay: function (attempt) {
      return Math.pow(2, attempt) * delayConstant;
    }
  };
  const response = await persistentFetch(input, requestOptionsWithRetry).catch((err) => {
    throw Error(`${err.name}: ${err.message}.`);
  });
  if (response?.ok) {
    return response;
  }
  const text = await response.text();
  throw Error(`${response.status}: ${text}: Network request failed.`);
};

/** Service class that abstracts function calls to ona data api */
export class OnaApiService {
  private baseUrl: string;
  private token: string;
  private logger: LogFn | undefined;
  private controller?: AbortController;
  private signal?: AbortSignal;

  constructor(baseUrl: string, apiToken: string, logger?: LogFn, controller?: AbortController) {
    this.baseUrl = baseUrl;
    this.token = apiToken;
    this.logger = logger;
    this.controller = controller;
    this.signal = controller?.signal;
  }

  /** defines shared options to be added to fetch request */
  getCommonFetchOptions() {
    const signal = this.signal;
    return {
      signal,
      headers: {
        Authorization: `token ${this.token}`,
        'content-type': 'application/json'
      }
    };
  }

  /** fetches single form with the given id
   * @param formId - form id for form
   * @param getFormPath - endpoint to use when fetching forms
   */
  async fetchSingleForm(formId: string, getFormPath: string = formEndpoint) {
    const formUrl = `${this.baseUrl}/${getFormPath}/${formId}`;
    return customFetch(formUrl, { ...this.getCommonFetchOptions() }, this.logger)
      .then((res) => {
        this.logger?.(createVerboseLog(`Fetched form wih form id: ${formId}`));
        return res.json().then((form: Form) => {
          return Result.ok<Form>(form);
        });
      })
      .catch((err) => {
        this.logger?.(
          createErrorLog(`Operation to fetch form: ${formId}, failed with err: ${err}`)
        );
        return Result.fail<Form>(err);
      });
  }

  /** Wrapper around generator function that fetches form submission for form with the given id.
   * @param formId - form id whose submissions we should fetch
   * @param totalSubmissions - Total number of submissions, to help with terminating pagination
   * @param extraQueryObj - extra search query params
   * @param pageSize - the number of records to fetch.
   * @param getSubmissionsPath - endpoint
   */
  async fetchPaginatedFormSubmissions<FormSubmissionT extends BaseFormSubmission>(
    formId: string,
    totalSubmissions: number,
    extraQueryObj: Record<string, string> = {},
    pageSize = 100,
    getSubmissionsPath: string = submittedDataEndpoint
  ) {
    const formSubmissionIterator = this.fetchPaginatedFormSubmissionsGenerator<FormSubmissionT>(
      formId,
      totalSubmissions,
      extraQueryObj,
      pageSize,
      getSubmissionsPath
    );

    const formSubmissions: FormSubmissionT[][] = [];
    for await (const formSubmissionResult of formSubmissionIterator) {
      if (formSubmissionResult.isSuccess) {
        const value = formSubmissionResult.getValue();
        formSubmissions.push(value);
      }
    }
    const flattened = flatMap(formSubmissions);
    return Result.ok(flattened);
  }

  /** An async generator function that fetches submissions for form with the givenId
   * @param formId - form id whose submissions we should fetch
   * @param totalSubmissions - Total number of submission, helps with pagination termination
   * @param extraQueryObj - extra search query params
   * @param pageSize - the number of records to fetch.
   * @param getSubmissionsPath - endpoint
   */
  async *fetchPaginatedFormSubmissionsGenerator<FormSubmissionT extends BaseFormSubmission>(
    formId: string,
    totalSubmissions: number,
    extraQueryObj: Record<string, string> = {},
    pageSize = 100,
    getSubmissionsPath: string = submittedDataEndpoint
  ) {
    const fullSubmissionsUrl = `${this.baseUrl}/${getSubmissionsPath}/${formId}`;
    let page = 1;

    do {
      const query = {
        page_size: `${pageSize}`,
        page: `${page}`,
        ...extraQueryObj
      };
      const sParams = new URLSearchParams(query);
      const paginatedSubmissionsUrl = `${fullSubmissionsUrl}?${sParams.toString()}`;

      page = page + 1;
      yield await customFetch(
        paginatedSubmissionsUrl,
        { ...this.getCommonFetchOptions() },
        this.logger
      )
        .then((res) => {
          return (res.json() as Promise<FormSubmissionT[]>).then((res) => {
            this.logger?.(
              createInfoLog(
                `Fetched ${res.length} submissions for form id: ${formId} page: ${paginatedSubmissionsUrl}`
              )
            );
            return Result.ok(res);
          });
        })
        .catch((err: Error) => {
          this.logger?.(
            createErrorLog(
              `Unable to fetch submissions for form id: ${formId} page: ${paginatedSubmissionsUrl} with err : ${err.message}`
            )
          );
          return Result.fail<FormSubmissionT[]>(err.message);
        });
    } while (page * pageSize <= totalSubmissions);
  }

  /** makes single reqest to edit a single form submission
   * @param formId - the id of form whose submission is being edited
   * @param submissionPayload - obj representing onadata submission
   * @param editSubmissionPath - endpoint to send data.
   */
  async editSubmission(
    formId: string,
    submissionPayload: Record<string, unknown>,
    editSubmissionPath: string = editSubmissionEndpoint
  ) {
    const oldInstanceId = submissionPayload['meta/instanceID'];
    const newInstanceId = `uuid:${v4()}`;
    const payload = {
      id: formId,
      submission: {
        ...submissionPayload,
        meta: {
          instanceID: newInstanceId,
          deprecatedID: oldInstanceId
        }
      }
    };
    const fullEditSubmissionUrl = `${this.baseUrl}/${editSubmissionPath}`;

    return await customFetch(
      fullEditSubmissionUrl,
      {
        ...this.getCommonFetchOptions(),
        method: 'POST',
        body: JSON.stringify(payload)
      },
      this.logger
    )
      .then((res) => {
        this.logger?.(
          createVerboseLog(
            `Edited submission with _id: ${submissionPayload._id} for form: ${formId}`
          )
        );
        return res.json().then((response) => {
          return Result.ok<Record<string, string>>(response);
        });
      })
      .catch((err) => {
        this.logger?.(
          createErrorLog(
            `Failed to edit sumbission with _id: ${submissionPayload._id} for form with id: ${formId} with err: ${err.message}`
          )
        );
        return Result.fail(err);
      });
  }
}

/** wrapper that helps edit the marker color field in a submission push it to the api
 * @param service - Service class object
 * @param formId - form whose submission is being edited
 * @param submission - original submission object
 * @param colorCode - color to change the submission marker-color to.
 */
export async function upLoadMarkerColor(
  service: OnaApiService,
  formId: string,
  submission: RegFormSubmission,
  colorCode: Color
) {
  const newSubmission = {
    ...submission,
    [markerColorAccessor]: colorCode
  };
  return service.editSubmission(formId, newSubmission);
}
