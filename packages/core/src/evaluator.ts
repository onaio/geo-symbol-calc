import { OnaApiService, upLoadMarkerColor } from './services';
import { Config, Metric, RegFormSubmission } from './types';
import {
  colorDeciderFactory,
  computeTimeToNow,
  createErrorLog,
  createInfoLog,
  createMetric,
  defaultReadMetric,
  defaultWriteMetric,
  getMostRecentVisitDateForFacility,
  isPipelineRunning,
  Result,
  Sig
} from './utils';
import cron from 'node-cron';
import { markerColorAccessor, numOfSubmissionsAccessor } from './constants';

/** The main function that is able to consume a symbol config, and from it,
 * pull the submissions from the api, after which its able to decide marker-color change
 * and pushes the same to the api.
 *
 * @param config - symbol config
 */
export async function* baseEvaluate(config: Omit<Config, 'schedule'>) {
  const startTime = Date.now();
  let endTime = null;
  let evaluatedSubmissions = 0;
  let notModifiedWithError = 0;
  let notModifiedWithoutError = 0;
  let modified = 0;
  let totalRegFormSubmissions = 0;

  // allows us to continously and progressively get reports on number of submissions evaluated.
  yield createMetric(
    config.uuid,
    startTime,
    null,
    evaluatedSubmissions,
    notModifiedWithoutError,
    notModifiedWithError,
    modified
  );

  const { formPair, symbolConfig, logger, baseUrl, apiToken, requestController } = config;
  const regFormSubmissionChunks = config['regFormSubmissionChunks'] ?? 1000;
  const { regFormId: registrationFormId, visitFormId: visitformId } = formPair;

  const service = new OnaApiService(baseUrl, apiToken, logger, requestController);
  const colorDecider = colorDeciderFactory(symbolConfig, logger);

  abortableBlock: {
    const start = performance.now(); //
    const regForm = await service.fetchSingleForm(registrationFormId);
    const stop1RegForm = performance.now(); //
    if (regForm.isFailure) {
      endTime = Date.now();
      yield createMetric(
        config.uuid,
        startTime,
        endTime,
        evaluatedSubmissions,
        notModifiedWithoutError,
        notModifiedWithError,
        modified
      );
      return;
    }
    const regFormSubmissionsNum = regForm.getValue()[numOfSubmissionsAccessor];
    totalRegFormSubmissions = regFormSubmissionsNum;
    const regFormSubmissionsIterator = service.fetchPaginatedFormSubmissionsGenerator(
      registrationFormId,
      regFormSubmissionsNum,
      {},
      regFormSubmissionChunks
    );
    const stop2StartingPageFetch = performance.now();
    for await (const regFormSubmissionsResult of regFormSubmissionsIterator) {
      if (regFormSubmissionsResult.isFailure) {
        if (regFormSubmissionsResult.errorCode === Sig.ABORT_EVALUATION) {
          break abortableBlock;
        }
        continue;
      }
      const regFormSubmissions = regFormSubmissionsResult.getValue();
      const updateRegFormSubmissionsPromises = (regFormSubmissions as RegFormSubmission[]).map((regFormSubmission) => 
        async () => {
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
          const timeDifference = computeTimeToNow(mostRecentVisitResult);
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
          } else {
            notModifiedWithoutError++;
          }
        }
      );

      const stopStartEdit = performance.now(); //
      let cursor = 0;
      const postChunks = 100;
      while(cursor <= updateRegFormSubmissionsPromises.length){
        const end = cursor + postChunks;
        const chunksToSend = updateRegFormSubmissionsPromises.slice(cursor, end);
        cursor = cursor + postChunks
        await Promise.allSettled(chunksToSend.map(x => x()));
      }
      //await Promise.allSettled(updateRegFormSubmissionsPromises);
      const stopEndEdit = performance.now(); //
      logger?.(createInfoLog(`evaluating page: from ${stopStartEdit} to ${stopEndEdit} i.e in: ${stopEndEdit - stopStartEdit}`))
    }
    endTime = Date.now();

    logger?.(
      createInfoLog(
        `Finished form pair {regFormId: ${config.formPair.regFormId}, visitFormId: ${config.formPair.visitFormId}}`
      )
    );
  }

  yield createMetric(
    config.uuid,
    startTime,
    endTime,
    evaluatedSubmissions,
    notModifiedWithoutError,
    notModifiedWithError,
    modified,
    totalRegFormSubmissions
  );
  return;
}

export async function evaluate(config: Omit<Config, 'schedule'>) {
  // we are not creating re-running config pipelines willy nilly.
  // so we read the config, either by defualt checking on a variable or calling a function.
  const WriteMetric = config.writeMetric ?? defaultWriteMetric;
  const ReadMetric = config.readMetric ?? defaultReadMetric;
  const pendingMetric = ReadMetric(config.uuid) as Metric | undefined;
  let finalMetric;
  // we'll run the pipeline if a metric does not exist or it exists but has an endTime
  const taskIsRunning = isPipelineRunning(pendingMetric);
  if (!taskIsRunning) {
    for await (const metric of baseEvaluate(config)) {
      WriteMetric(metric);
      finalMetric = metric;
    }
    return Result.ok(finalMetric);
  } else {
    return Result.fail('Pipeline is already Running');
  }
}

/** Wrapper around the transform function, calls transform on a schedule */
export function evaluateOnSchedule(config: Config) {
  const { schedule, ...restConfigs } = config;

  const task = cron.schedule(schedule, () =>
    evaluate(restConfigs).catch((err) => {
      config.logger?.(createErrorLog(err.message));
    })
  );
  return task;
}
