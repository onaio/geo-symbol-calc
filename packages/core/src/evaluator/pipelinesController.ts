import { uuid, Config } from '../helpers/types';
import { Result } from '../helpers/utils';
import cron from 'node-cron';
import { ConfigRunner } from './configRunner';
import { isEqual } from 'lodash';

console.log({cron})

interface GetConfigs {
  (): Config[];
}

export class PipelinesController {
  private pipelines: Record<uuid, ConfigRunner> = {};
  private tasks: Record<uuid, cron.ScheduledTask> = {};
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

  // called to setup cron tasks.
  evaluateOnSchedule(configId?: string) {
    if (configId) {
      const interestingPipeline = this.pipelines[configId];
      const task = interestingPipeline.schedule();
      this.tasks[configId] = task;
    }
    for (const pipeline of Object.values(this.pipelines)) {
      this.tasks[pipeline.config.uuid] = pipeline.schedule();
    }
  }

  stopScheduledEvaluations(configId?: string) {
    if (configId) {
      const interestingTask = this.tasks[configId];
      const interestingPipeline = this.pipelines[configId];
      interestingPipeline.cancel();
      interestingTask.stop();
    } else {
      for (const pipeline of Object.values(this.pipelines)) {
        pipeline.cancel();
      }
      for (const task of Object.values(this.tasks)) {
        task.stop();
      }
    }
  }

  reEvaluatedScheduled() {
    const configs = this.getConfigs();
    const existingPipelinesCounter = {
      ...this.pipelines
    };
    for (const config of configs) {
      const thisConfigId = config.uuid;
      delete existingPipelinesCounter[thisConfigId];
      const existingPipeline = this.pipelines[thisConfigId];
      if (!existingPipeline) {
        // new config was added.
        this.pipelines[thisConfigId] = new ConfigRunner(config);
      } else if (!isEqual(this.pipelines.config, config)) {
        this.stopScheduledEvaluations(thisConfigId);
        // update pipeline
        existingPipeline.updateConfig(config);
        existingPipeline.schedule();
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [uuid, _] of Object.entries(existingPipelinesCounter)) {
      delete this.pipelines[uuid];
    }
  }

  manualTriggerEvaluation(configId: string) {
    const interestingPipeline = this.pipelines[configId];
    if (!interestingPipeline) {
      return Result.fail(`Pipeline with config ${configId} was not found`);
    }
    interestingPipeline.transform();
    return Result.ok('Pipeline triggered successfully, running in the background');
  }

  cancel(configId?: string) {
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

  getPipelines(configId?: string) {
    if (configId) {
      return this.pipelines[configId];
    }
    return Object.values(this.pipelines);
  }

  getTasks(configId?: string) {
    if (configId) {
      return this.tasks[configId];
    }
    return Object.values(this.tasks);
  }
}
