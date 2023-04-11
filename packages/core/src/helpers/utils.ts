import { keyBy } from 'lodash-es';
import {
  Config,
  LogFn,
  LogMessageLevels,
  Metric,
  PriorityLevel,
  RegFormSubmission,
  SymbologyConfig,
  timestamp,
  VisitFormSubmission,
  WriteMetric
} from './types';
import * as yup from 'yup';
import nodeCron from 'node-cron';
import { dateOfVisitAccessor, priorityLevelAccessor } from '../constants';
import { OnaApiService } from '../services/onaApi/services';
import { MISSING_PRIORITY_LEVEL, NO_VISIT_SUBMISSIONS, Result, UNRECOGNIZED_PRIORITY_LEVEL } from './Result';

export const createInfoLog = (message: string) => ({ level: LogMessageLevels.INFO, message });
export const createWarnLog = (message: string) => ({ level: LogMessageLevels.WARN, message });
export const createErrorLog = (message: string) => ({ level: LogMessageLevels.ERROR, message });
export const createDebugLog = (message: string) => ({ level: LogMessageLevels.DEBUG, message });
export const createVerboseLog = (message: string) => ({ level: LogMessageLevels.VERBOSE, message });

/** for each priority level order the symbology on overflow such that the overflow days are in ascending order. */
const orderSymbologyConfig = (config: SymbologyConfig) => {
  return config.map(({ priorityLevel, symbologyOnOverflow, frequency }) => {
    const unorderedOverFlowDays = symbologyOnOverflow;
    return {
      priorityLevel,
      frequency,
      symbologyOnOverflow: unorderedOverFlowDays.slice().sort((overFlow1, overFlow2) => {
        return overFlow1.overFlowDays - overFlow2.overFlowDays;
      })
    };
  });
};

export const colorDeciderFactory = (symbolConfig: SymbologyConfig, logger?: LogFn) => {
  const orderedSymbologyConfig = orderSymbologyConfig(symbolConfig);

  const colorDecider = (
    recentVisitDiffToNow: number | typeof Infinity,
    submission: RegFormSubmission
  ) => {
    const thisFacilityPriority = submission[priorityLevelAccessor] as PriorityLevel | undefined;

    if (!thisFacilityPriority) {
      logger?.(createWarnLog(`facility _id: ${submission._id} does not have a priority_level`));
      return Result.fail("Missing priority level", MISSING_PRIORITY_LEVEL);
    }

    // TODO - risky coupling.
    const symbologyConfigByPriorityLevel = keyBy(orderedSymbologyConfig, 'priorityLevel');
    const symbologyConfig = symbologyConfigByPriorityLevel[thisFacilityPriority];
    // TODO -  when priority_level is unrecognized. - do we need to also report facilities affected by this errors
    if(symbolConfig === undefined){
      logger?.(createWarnLog("Unrecognized priority level"))
      return Result.fail("Unrecognized priority level", UNRECOGNIZED_PRIORITY_LEVEL)
    }

    const overflowsConfig = symbologyConfig.symbologyOnOverflow;
    let colorChoice = overflowsConfig[overflowsConfig.length - 1].color;

    for (const value of overflowsConfig) {
      const { overFlowDays, color } = value;
      if (recentVisitDiffToNow <= symbologyConfig.frequency + overFlowDays) {
        colorChoice = color;
        break;
      }
    }
    return Result.ok(colorChoice);
  };

  return colorDecider;
};

export const configValidationSchema = yup.object().shape({
  uuid: yup.string().required('Config does not have an identifier'),
  title: yup.string(),
  baseUrl: yup.string().required('Base Url is required'),
  regFormId: yup.string().required('Geo point registration form is required'),
  visitFormId: yup.string().required('Visit form field is required'),
  apiToken: yup.string().required('A valid api token is required'),
  symbolConfig: yup
    .array()
    .of(
      yup.object().shape({
        priorityLevel: yup.string().oneOf(Object.values(PriorityLevel)),
        frequency: yup.number().required('Frequencey is required'),
        symbologyOnOverflow: yup.array().of(
          yup.object().shape({
            overFlowDays: yup.number().required('Over flow days is required'),
            color: yup.string().required('Color code is required.')
          })
        )
      })
    )
    .ensure()
    .min(1),
  schedule: yup
    .string()
    .test('schedule', 'Schedule is not valid cron syntax', function (value?: string) {
      return !!(value && nodeCron.validate(value));
    })
});

export const validateConfigs = (config: Config) => {
  return configValidationSchema.validateSync(config);
};

export async function getMostRecentVisitDateForFacility(
  service: OnaApiService,
  facilityId: number,
  visitFormId: string,
  logger?: LogFn
) {

  // can run into an error,
  // can  yield an empty result.
  const query = {
    query: `{"facility": ${facilityId}}`, // filter visit submissions for this facility
    sort: `{"${dateOfVisitAccessor}": -1}` // sort in descending, most recent first.
  };

  // fetch the most recent visit submission for this facility
  const formSubmissionIterator =
    service.fetchPaginatedFormSubmissionsGenerator<VisitFormSubmission>(visitFormId, 1, query, 1);

    const visitSubmissionsResult = (await formSubmissionIterator
      .next()
      .then((res) => res.value)) as Result<VisitFormSubmission[]>;
    
  if (visitSubmissionsResult.isFailure) {
    logger?.(
      createErrorLog(
        `Operation to fetch submission for facility: ${facilityId} failed with error: ${visitSubmissionsResult.error}`
      )
    );

    // TODO - can we create a result from another result; can add method passResult.
    return Result.bubbleFailure<timestamp, unknown>(visitSubmissionsResult);
  }

  const visitSubmissions = visitSubmissionsResult.getValue();
  const mostRecentSubmission = visitSubmissions[0];

  if (mostRecentSubmission !== undefined) {
    logger?.(
      createInfoLog(
        `facility _id: ${facilityId} latest visit submission has _id: ${mostRecentSubmission._id}`
      )
    );

    const dateOfVisit = Date.parse(mostRecentSubmission[dateOfVisitAccessor]);
    return Result.ok<timestamp>(dateOfVisit);
  } else {
    logger?.(createWarnLog(`facility _id: ${facilityId} has no visit submissions`));
    return Result.ok<undefined>(undefined, NO_VISIT_SUBMISSIONS);
  }
}

export function computeTimeToNow(date?: timestamp) {
  let recentVisitDiffToNow = Infinity;

  if (date === undefined) {
    return recentVisitDiffToNow;
  }
  const now = Date.now();
  const msInADay = 1000 * 60 * 60 * 24;
  recentVisitDiffToNow = Math.ceil((now - date) / msInADay);
  return recentVisitDiffToNow;
}

export const evaluatingTasks: Record<string, Metric> = {};

export const defaultWriteMetric: WriteMetric = (metric: Metric) => {
  evaluatingTasks[metric.configId] = metric;
};
