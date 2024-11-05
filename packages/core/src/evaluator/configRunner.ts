import { OnaApiService } from '../services/onaApi/services';
import { RegFormSubmission, Config } from '../helpers/types';
import { numOfSubmissionsAccessor } from '../constants';
import {
  createInfoLog,
  createErrorLog,
  defaultWriteMetric,
  colorDeciderFactory,
  validateConfigs
} from '../helpers/utils';
import cron from 'node-cron';
import { createMetricFactory } from './helpers/utils';
import { transformFacility } from './helpers/utils';
import {
  Result,
  UNKNOWN_TRANSFORM_FACILITY_ERROR,
  ResultCodes,
  UNKNOWN_SUCCESS_REASON,
  EVALUATION_ABORTED,
  SuccessResultDetail,
  FailureResultDetail
} from '../helpers/Result';
import { ReportMetric, TriggeredBy } from './metricReporter';

/** Config Runner:
 * Create an object that has different properties that respectively represent a type of metric category.
 * when there is an action of the specific category, add count to the necessary method.
 */

/**
 * Represents a single config, Contains actions that pertain to the execution
 *  of the pipeline that a config represents. Objects of this class are interacted
 * with through the pipelines controller class.
 */
export class ConfigRunner {
  /** holds the json symbol config */
  public config: Config;
  /** Whether pipeline/runner is currently evaluating */
  private running = false;
  /** request abort controller */
  // private abortController;
  /** stores validity of config */
  public invalidError: string | null = null;
  /** metric category store for each run */
  // private reporter: ReportMetric;

  constructor(config: Config) {
    this.config = config;
    // this.abortController = new AbortController();
    try {
      validateConfigs(config);
    } catch (err: unknown) {
      this.invalidError = (err as Error).message;
    }
    // this.reporter = new ReportMetric(config.uuid);
  }

  /** Runs the pipeline, generator that yields metric information regarding the current run */
  private async *transformGenerator(triggeredVia: TriggeredBy) {
    const config = this.config;
    const {
      regFormId,
      visitFormId,
      symbolConfig,
      logger,
      baseUrl,
      apiToken,
      uuid: configId,
      regFormSubmissionChunks: facilityProcessingChunks,
      editSubmissionChunks: facilityEditChunks
    } = config;
    const regFormSubmissionChunks = facilityProcessingChunks ?? 1000;
    const editSubmissionsChunks = facilityEditChunks ?? 100;
    const reporter = new ReportMetric(configId);
    reporter.updateStart(triggeredVia);

    let totalRegFormSubmissions = 0;
    yield reporter.generateJsonReport();

    // const service = new OnaApiService(baseUrl, apiToken, logger, this.abortController);
    const service = new OnaApiService(baseUrl, apiToken, logger);
    const colorDecider = colorDeciderFactory(symbolConfig, logger);

    abortableBlock: {
      const regForm = await service.fetchSingleForm(regFormId);
      if (regForm.isFailure) {
        reporter.updateGeneralError(`Fetching form with id ${regFormId} failed due to : ${regForm.error}`)
        yield reporter.generateJsonReport(true);
        return;
      }
      const regFormSubmissionsNum = regForm.getValue()[numOfSubmissionsAccessor];
      totalRegFormSubmissions = regFormSubmissionsNum;
      reporter.updateTotalFacilities(totalRegFormSubmissions);

      // fetches submissions for the facility registration form.
      const regFormSubmissionsIterator = service.fetchPaginatedFormSubmissionsGenerator(
        regFormId,
        regFormSubmissionsNum,
        {},
        regFormSubmissionChunks
      );

      for await (const regFormSubmissionsResult of regFormSubmissionsIterator) {
        if (regFormSubmissionsResult.isFailure) {
          if (regFormSubmissionsResult.detail?.code === EVALUATION_ABORTED) {
            // TODO - reporter can report that the pipeline was cancelled.
            // this.updateMetric(EVALUATION_ABORTED, 0)
            break abortableBlock;
          } else {
            const { code, recsAffected } = (regFormSubmissionsResult.detail ??
              {}) as FailureResultDetail;
            const sanitizedCode = code ?? UNKNOWN_TRANSFORM_FACILITY_ERROR;
            // TODO - we are still updating metric reports as sideEffects in the code.
            reporter.updateFacilitiesNotEvaluated(sanitizedCode, recsAffected ?? 0);
          }
          continue;
        }

        const regFormSubmissions = regFormSubmissionsResult.getValue();
        const updateRegFormSubmissionsPromises = (regFormSubmissions as RegFormSubmission[]).map(
          (regFormSubmission) => async () => {
            reporter.updateFacilitiesEvaluated();
            const transformFacilityResult = await transformFacility(
              service,
              regFormSubmission,
              regFormId,
              visitFormId,
              colorDecider,
              logger
            );

            let resultCode = transformFacilityResult.detail?.code;

            // TODO - refactor all this.
            if (transformFacilityResult.isFailure) {
              if (!resultCode) resultCode = UNKNOWN_TRANSFORM_FACILITY_ERROR;
              reporter.updateEvaluatedNotModified(resultCode);
            } else if (
              transformFacilityResult.isSuccess &&
              (transformFacilityResult.detail as SuccessResultDetail)?.colorChange === undefined
            ) {
              if (!resultCode) {
                resultCode = UNKNOWN_SUCCESS_REASON;
              }
              reporter.updateEvaluatedNotModified(resultCode);
            } else {
              if (!resultCode) {
                resultCode = UNKNOWN_SUCCESS_REASON;
              }
              reporter.updateEvaluatedModified(
                resultCode,
                (transformFacilityResult.detail as SuccessResultDetail)?.colorChange as string
              );
            }
          }
        );

        let cursor = 0;
        while (cursor <= updateRegFormSubmissionsPromises.length) {
          const end = cursor + editSubmissionsChunks;
          const chunksToSend = updateRegFormSubmissionsPromises.slice(cursor, end);
          cursor = cursor + editSubmissionsChunks;
          await Promise.allSettled(chunksToSend.map((x) => x()));
        }
        yield reporter.generateJsonReport();
      }
    }
    logger?.(
      createInfoLog(
        `Finished form pair {regFormId: ${config.regFormId}, visitFormId: ${config.visitFormId}}`
      )
    );
    yield reporter.generateJsonReport(true);
  }

  /** Wrapper  around the transform generator, collates the metrics and calls a callback that
   * inverts the control of writing the metric information to the configs writeMetric method.
   */
  async transform(triggeredVia: TriggeredBy = 'schedule') {
    const config = this.config;
    if (this.invalidError) {
      return Result.fail(`Configuration is not valid, ${this.invalidError}`);
    }
    // create a function that parses the config and supplies default values.
    const WriteMetric = config.writeMetric ?? defaultWriteMetric;
    if (this.running) {
      return Result.fail('Pipeline is already running.');
    } else {
      this.running = true;
      let finalMetric;
      for await (const metric of this.transformGenerator(triggeredVia)) {
        WriteMetric(metric as any);
        finalMetric = metric;
      }
      this.running = false;
      return Result.ok(finalMetric);
    }
  }

  /** Register a node cron task to run this pipeline */
  schedule() {
    const config = this.config;
    const { schedule } = config;
    const task = cron.schedule(schedule, () => {
      this.transform().catch((err) => {
        config.logger?.(createErrorLog(err.message));
      });
    });
    return task;
  }

  /** Cancel evaluation using a configured abortController */
  cancel() {
    // const abortController = this.abortController;
    if (!this.running) {
      return;
    }
    // abortController.abort();
    return Result.ok();
  }

  /** Update the config on the fly. */
  updateConfig(config: Config) {
    this.cancel();
    this.config = config;
  }

  /** Describes the current run status of the pipeline */
  isRunning() {
    return this.running;
  }

  /** Whether config for this runner is valid */
  isValid() {
    return this.invalidError === null;
  }
}
