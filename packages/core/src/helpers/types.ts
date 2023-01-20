import { numOfSubmissionsAccessor } from '../constants';

export enum LogMessageLevels {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

export interface LogMessageObject {
  level: LogMessageLevels;
  message: string;
}

export type LogFn = (message: LogMessageObject) => void;
export type CronTabString = string;

/** Describes the configs for a single pipeline */
export interface Config {
  // an id: helps with managing the configs
  uuid: string;
  // id for form used to register the geo points
  regFormId: string;
  // id for form used by Health workers to visit added geopoints
  visitFormId: string;
  // Business rules config - How to decide which color codes to add per facility id
  symbolConfig: SymbologyConfig;
  // logger function
  logger?: LogFn;
  // More permanent token, you can get this from `{{ _.baseUrl }}/api/v1/user`.api_token
  apiToken: string;
  // base url where the api instance is deployed
  baseUrl: string;
  // cron-like syntax that represents when the pipeline represented by this config runs.
  schedule: CronTabString;
  // how many registration form submissions to process at a time.
  regFormSubmissionChunks?: number;
  // store metric; progress information regarding a running or the last run of an pipeline
  writeMetric: WriteMetric;
  // Abort controller to abort evaluation of this pipeline
  requestController: AbortController;
}

export enum PriorityLevel {
  VERY_HIGH = 'Very_High',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export type uuid = string;
export type Color = string;
export type timestamp = number;

export type SymbologyConfig = {
  priorityLevel: PriorityLevel;
  // Max number of days since the last visit to geopoint with the aforementioned priority level
  frequency: number;
  /* Color code configs depending on days passed since the frequency days lapsed.
  * The color is matched using <= operator i.e. if days passed are less than or equal to frequency + overFlowDays.
  * e.g {
      priorityLevel: PriorityLevel.VERY_HIGH,
      frequency: 3,
      symbologyOnOverflow: [
        {
          overFlowDays: 0,
          color: 'green'
        },
        {
          overFlowDays: 1,
          color: 'yellow'
        },
        {
          overFlowDays: 4,
          color: 'red'
        }
      ]
    }
    given the above config the color will be picked as follows:
    on day (today - last visit)
    on day 0 - green since 0 <= (3 + 0) (frequency + overflow days)
    on day 3 - green since 3 <= (3 + 0)
    on day 4 - yellow since 4 > (3 + 0) but 4 <= (3 + 1)
    on day 5 - red since 5 > (3 + 0) and 5 > 4 (3 + 1) but 5 < (3 + 4)
    */
  symbologyOnOverflow: { overFlowDays: number; color: Color }[];
}[];

export interface BaseFormSubmission {
  _id: number;
  'meta/instanceID': string;
}

export interface RegFormSubmission extends BaseFormSubmission {
  'marker-symbol': string;
  'marker-color': string;
  priority_level: PriorityLevel;
}

export interface VisitFormSubmission extends BaseFormSubmission {
  date_of_visit: string;
}

export interface Form {
  formid: number;
  [numOfSubmissionsAccessor]: number;
}

export interface Metric {
  configId: string;
  startTime: timestamp;
  endTime: timestamp | null;
  evaluated: number;
  notModifiedWithoutError: number;
  notModifiedWithError: number;
  modified: number;
  totalSubmissions?: number;
}

export interface WriteMetric {
  (metric: Metric): void;
}
