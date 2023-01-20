import { OnaApiService } from '../services/onaApi/services';
import { RegFormSubmission, Config } from '../helpers/types';
import { numOfSubmissionsAccessor } from '../constants';
import {
  createInfoLog,
  createErrorLog,
  defaultWriteMetric,
  colorDeciderFactory
} from '../helpers/utils';
import cron from 'node-cron';
import { createMetricFactory } from './helpers/utils';
import { transformFacility } from './helpers/utils';
import { Sig, Result } from '../helpers/Result';

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

  constructor(config: Config) {
    this.config = config;
  }

  /** Runs the pipeline, generator that yields metric information regarding the current run */
  async *transformGenerator() {
    const config = this.config;
    const {
      regFormId,
      visitFormId,
      symbolConfig,
      logger,
      baseUrl,
      apiToken,
      requestController,
      uuid: configId,
      regFormSubmissionChunks: facilityProcessingChunks
    } = config;
    const regFormSubmissionChunks = facilityProcessingChunks ?? 1000;

    this.running = true;

    const startTime = Date.now();
    const createMetric = createMetricFactory(startTime, configId);
    let evaluatedSubmissions = 0;
    let notModifiedWithError = 0;
    let notModifiedWithoutError = 0;
    let modified = 0;
    let totalRegFormSubmissions = 0;

    // allows us to continously and progressively get reports on number of submissions evaluated.
    yield createMetric(
      evaluatedSubmissions,
      notModifiedWithoutError,
      notModifiedWithError,
      modified,
      totalRegFormSubmissions
    );

    const service = new OnaApiService(baseUrl, apiToken, logger, requestController);
    const colorDecider = colorDeciderFactory(symbolConfig, logger);

    abortableBlock: {
      const regForm = await service.fetchSingleForm(regFormId);
      if (regForm.isFailure) {
        return createMetric(
          evaluatedSubmissions,
          notModifiedWithoutError,
          notModifiedWithError,
          modified,
          totalRegFormSubmissions,
          true
        );
      }
      const regFormSubmissionsNum = regForm.getValue()[numOfSubmissionsAccessor];
      totalRegFormSubmissions = regFormSubmissionsNum;

      // fetches submissions for the first form.
      const regFormSubmissionsIterator = service.fetchPaginatedFormSubmissionsGenerator(
        regFormId,
        regFormSubmissionsNum,
        {},
        regFormSubmissionChunks
      );

      for await (const regFormSubmissionsResult of regFormSubmissionsIterator) {
        if (regFormSubmissionsResult.isFailure) {
          if (regFormSubmissionsResult.errorCode === Sig.ABORT_EVALUATION) {
            break abortableBlock;
          }
          continue;
        }

        const regFormSubmissions = regFormSubmissionsResult.getValue();
        const updateRegFormSubmissionsPromises = (regFormSubmissions as RegFormSubmission[]).map(
          (regFormSubmission) => async () => {
            const modificationStatus = await transformFacility(
              service,
              regFormSubmission,
              regFormId,
              visitFormId,
              colorDecider,
              logger
            );
            const { modified: moded, error: modError } = modificationStatus;
            evaluatedSubmissions++;
            if (moded) {
              modified++;
            } else {
              modError ? notModifiedWithError++ : notModifiedWithoutError++;
            }
          }
        );

        let cursor = 0;
        const postChunks = 100;
        while (cursor <= updateRegFormSubmissionsPromises.length) {
          const end = cursor + postChunks;
          const chunksToSend = updateRegFormSubmissionsPromises.slice(cursor, end);
          cursor = cursor + postChunks;
          await Promise.allSettled(chunksToSend.map((x) => x()));
        }
      }
    }
    logger?.(
      createInfoLog(
        `Finished form pair {regFormId: ${config.regFormId}, visitFormId: ${config.visitFormId}}`
      )
    );
    yield createMetric(
      evaluatedSubmissions,
      notModifiedWithoutError,
      notModifiedWithError,
      modified,
      totalRegFormSubmissions,
      true
    );
    this.running = false;
  }

  /** Wrapper  around the transform generator, collates the metrics and calls a callback that
   * inverts the control of writing the metric information to the configs writeMetric method.
   */
  async transform() {
    // create a function that parses the config and supplies default values.
    const config = this.config;
    const WriteMetric = config.writeMetric ?? defaultWriteMetric;
    if (this.running) {
      return Result.fail('Pipeline is already running.');
    } else {
      let finalMetric;
      for await (const metric of this.transformGenerator()) {
        WriteMetric(metric);
        finalMetric = metric;
      }
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
    const config = this.config;
    const abortController = config.requestController;
    if (!abortController) {
      return Result.fail(`Abort controller not set for config : ${config.uuid}`);
    }
    if (!this.running) {
      return;
    }
    abortController.abort();
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
}
