import { OnaApiService, upLoadMarkerColor } from './services';
import { Config, Metrics, RegFormSubmission } from './types';
import {
  colorDeciderFactory,
  computeTimeToKnow,
  createErrorLog,
  createInfoLog,
  createMetric,
  getMostRecentVisitDateForFacility
} from './utils';
import cron from 'node-cron';
import { markerColorAccessor, numOfSubmissionsAccessor } from './constants';

export const evaluatingTasks: Record<string, Promise<Metrics>> = {};

/** The main function that is able to consume a symbol config, and from it,
 * pull the submissions from the api, after which its able to decide marker-color change
 * and pushes the same to the api.
 *
 * @param config - symbol config
 */
export async function baseEvaluate(config: Omit<Config, 'schedule'>) {
  const startTime = Date.now();
  let endTime;
  let evaluatedSubmissions = 0;
  let notModifiedWithError = 0;
  let notModifiedWithoutError = 0;
  let modified = 0;
  const { formPair, symbolConfig, logger, baseUrl, apiToken } = config;
  const regFormSubmissionChunks = config['regFormSubmissionChunks'] ?? 1000;
  const { regFormId: registrationFormId, visitFormId: visitformId } = formPair;

  const service = new OnaApiService(baseUrl, apiToken, logger);
  const colorDecider = colorDeciderFactory(symbolConfig, logger);

  const regForm = await service.fetchSingleForm(registrationFormId);
  if (regForm.isFailure) {
    endTime = Date.now();
    return createMetric(
      config.uuid,
      startTime,
      endTime,
      evaluatedSubmissions,
      notModifiedWithoutError,
      notModifiedWithError,
      modified
    );
  }
  const regFormSubmissionsNum = regForm.getValue()[numOfSubmissionsAccessor];
  const regFormSubmissionsIterator = service.fetchPaginatedFormSubmissionsGenerator(
    registrationFormId,
    regFormSubmissionsNum,
    {},
    regFormSubmissionChunks
  );

  for await (const regFormSubmissionsResult of regFormSubmissionsIterator) {
    if (regFormSubmissionsResult.isFailure) {
      continue;
    }
    const regFormSubmissions = regFormSubmissionsResult.getValue();
    const updateRegFormSubmissionsPromises = (regFormSubmissions as RegFormSubmission[]).map(
      async (regFormSubmission) => {
        evaluatedSubmissions++;
        const facilityId = regFormSubmission._id;
        const mostRecentVisitResult = await getMostRecentVisitDateForFacility(
          service,
          facilityId,
          visitformId,
          logger
        );
        if (mostRecentVisitResult.isFailure) {
          notModifiedWithError++;
          return;
        }
        const timeDifference = computeTimeToKnow(mostRecentVisitResult);
        const color = colorDecider(timeDifference, regFormSubmission);
        if (color) {
          if (regFormSubmission[markerColorAccessor] === color) {
            notModifiedWithoutError++;
            logger?.(
              createInfoLog(
                `facility _id: ${facilityId} submission already has the correct color, no action needed`
              )
            );
          } else {
            const uploadMarkerResult = await upLoadMarkerColor(
              service,
              registrationFormId,
              regFormSubmission,
              color
            );
            if (uploadMarkerResult.isFailure) {
              notModifiedWithError++;
            } else {
              modified++;
            }
          }
        }
      }
    );

    await Promise.allSettled(updateRegFormSubmissionsPromises);
  }
  endTime = Date.now();

  logger?.(
    createInfoLog(
      `Finished form pair {regFormId: ${config.formPair.regFormId}, visitFormId: ${config.formPair.visitFormId}}`
    )
  );
  return createMetric(
    config.uuid,
    startTime,
    endTime,
    evaluatedSubmissions,
    notModifiedWithoutError,
    notModifiedWithError,
    modified
  );
}

export async function evaluate(config: Omit<Config, 'schedule'>) {
  // we are not creating re-running config pipelines willy nilly.
  let pendingPromise = evaluatingTasks[config.uuid];
  if (evaluatingTasks[config.uuid] === undefined) {
    pendingPromise = baseEvaluate(config);
    evaluatingTasks[config.uuid] = pendingPromise;
  }
  return await pendingPromise
    .then((metrics) => {
      return metrics;
    })
    .finally(() => {
      delete evaluatingTasks[config.uuid];
    });
}

/** Wrapper around the transform function, calls transform on a schedule */
export function evaluateOnSchedule(config: Config, callback: (metrics: Metrics) => void) {
  const { schedule, ...restConfigs } = config;

  const task = cron.schedule(schedule, () =>
    evaluate(restConfigs)
      .then((metric) => callback(metric))
      .catch((err) => {
        config.logger?.(createErrorLog(err.message));
      })
  );
  return task;
}
