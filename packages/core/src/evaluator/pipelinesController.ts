import { uuid, Config } from '../helpers/types';
import cron from 'node-cron';
import { ConfigRunner } from './configRunner';
import { isEqual } from 'lodash-es';
import { Result } from '../helpers/Result';

interface GetConfigs {
  (): Config[];
}

/** facade for managing one or more pipelines represented by their Symbol configs */
export class PipelinesController {
  /** stores pipelines - representin symbol configs passed to the constructor */
  private pipelines: Record<uuid, ConfigRunner> = {};
  /** stores cron scheduled tasks */
  private tasks: Record<uuid, cron.ScheduledTask> = {};
  /** returns the symbolConfigs. the configs can chane dynmacially that is why this is a function */
  private getConfigs: GetConfigs;

  constructor(getConfigs: GetConfigs) {
    const configs = getConfigs();
    const configPipelinesById: Record<uuid, ConfigRunner> = {};
    for (const config of configs) {
      const configPipeline = new ConfigRunner(config);
      configPipelinesById[config.uuid] = configPipeline;
    }
    this.pipelines = configPipelinesById;
    this.getConfigs = getConfigs;
  }

  /** Setup cron schedule tasks for all configs or single config if id is provided
   * @param configId - id for the config whose pipeline should be queed to run on a schedule.
   */
  runOnSchedule(configId?: string) {
    if (configId) {
      const interestingPipeline = this.pipelines[configId];
      const task = interestingPipeline.schedule();
      this.tasks[configId] = task;
    }
    for (const pipeline of Object.values(this.pipelines)) {
      this.tasks[pipeline.config.uuid] = pipeline.schedule();
    }
  }

  /** stops and removes the cron tasks that run pipelines.
   * @param configId - stop only the pipeline that is keyed by this configid
   */
  stopAndRemoveTasks(configId?: string) {
    if (configId) {
      const interestingTask = this.tasks[configId];
      interestingTask?.stop();
      delete this.tasks[configId];
    } else {
      Object.values(this.tasks).forEach((task) => {
        task.stop();
      });
      this.tasks = {};
    }
  }

  /** cancel all running pipelines
   * @param configId - cancel single pipeline keyed by this configId
   */
  cancelPipelines(configId?: string) {
    if (configId) {
      const interestingPipeline = this.pipelines[configId];
      return interestingPipeline.cancel();
    } else {
      const cancelResults = [];
      for (const pipelines of Object.values(this.pipelines)) {
        cancelResults.push(pipelines.cancel());
      }
      return cancelResults;
    }
  }

  removePipelines(configId?: string) {
    if (configId) {
      delete this.pipelines[configId];
    } else {
      this.pipelines = {};
    }
  }

  /** Called to restart pipeline's evaluation should configs change */
  refreshConfigRunners() {
    const configs = this.getConfigs();
    const existingPipelinesCounter = {
      ...this.pipelines
    };

    for (const config of configs) {
      const thisConfigId = config.uuid;
      const existingPipeline = this.pipelines[thisConfigId];
      delete existingPipelinesCounter[thisConfigId];

      if (!existingPipeline) {
        this.pipelines[thisConfigId] = new ConfigRunner(config);
        this.runOnSchedule(thisConfigId);
        continue;
      }
      if (isEqual(existingPipeline.config, config)) {
        continue;
      } else {
        this.cancelPipelines(thisConfigId);
        this.removePipelines(thisConfigId);
        this.stopAndRemoveTasks(thisConfigId);
        this.pipelines[thisConfigId] = new ConfigRunner(config);
        this.runOnSchedule(thisConfigId);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [uuid, _] of Object.entries(existingPipelinesCounter)) {
      this.cancelPipelines(uuid);
      this.removePipelines(uuid);
      this.stopAndRemoveTasks(uuid);
    }
  }

  /** Triggers a pipeline on demand outside its schedule
   * @param configId - id for the pipeline that should be triggered.
   */
  manualTriggerEvaluation(configId: string) {
    const interestingPipeline = this.pipelines[configId];
    if (!interestingPipeline) {
      return Result.fail(`Pipeline with config ${configId} was not found`);
    }
    interestingPipeline.transform('manual');
    return Result.ok('Pipeline triggered successfully, running in the background');
  }

  /** returns all pipelines created so far */
  getPipelines(configId?: string) {
    if (configId) {
      return this.pipelines[configId];
    }
    return Object.values(this.pipelines);
  }

  /** returns tasks for the queued schedule runs. */
  getTasks(configId?: string) {
    if (configId) {
      return this.tasks[configId];
    }
    return Object.values(this.tasks);
  }
}
