// Result Codes: -  known static codes that can be used when reporting the
// result of an operation.

// # error  - associated.
export const EVALUATION_ABORTED = 'ECODE1' as const;
export const MISSING_PRIORITY_LEVEL = 'ECODE2' as const;
export const NETWORK_ERROR = 'ECODE3' as const;
export const UNRECOGNIZED_PRIORITY_LEVEL = 'ECODE5' as const;
export const UNKNOWN_TRANSFORM_FACILITY_ERROR = 'ECODE6' as const;

export type ErrorResultCodes =
  | typeof EVALUATION_ABORTED
  | typeof MISSING_PRIORITY_LEVEL
  | typeof NETWORK_ERROR
  | typeof UNRECOGNIZED_PRIORITY_LEVEL
  | typeof UNKNOWN_TRANSFORM_FACILITY_ERROR;

// # warning - associated
export const NO_VISIT_SUBMISSIONS = 'WCODE1' as const;

export type WarningResultCodes = typeof NO_VISIT_SUBMISSIONS;

// # Info associated
export const NO_SYMBOLOGY_CHANGE_NEEDED = 'ICODE1' as const;

export type InfoResultCodes = typeof NO_SYMBOLOGY_CHANGE_NEEDED;

// # success associated
export const MAKER_COLOR_UPDATED = 'SCODE1';
export const UNKNOWN_SUCCESS_REASON = 'SCODE2';

export type SuccessResultCodes = typeof UNKNOWN_SUCCESS_REASON | typeof MAKER_COLOR_UPDATED;

export const ResultCodings = {
  evaluationAborted: {
    code: EVALUATION_ABORTED,
    description: 'Evaluation was cancelled'
  },
  missingPriorityLevel: {
    code: MISSING_PRIORITY_LEVEL,
    description: 'Facility does not have a priority level'
  },
  networkError: {
    code: NETWORK_ERROR,
    description: 'Request failed due to an unrecoverable network error'
  },
  noVisitSubmissions: {
    code: NO_VISIT_SUBMISSIONS,
    description: 'Facility do not have visit submissions'
  },
  unrecognizedPriorityLevel: {
    code: UNRECOGNIZED_PRIORITY_LEVEL,
    description: 'Facility has an invalid priority level'
  },
  noSymblologyChangeNeeded: {
    code: NO_SYMBOLOGY_CHANGE_NEEDED,
    description: 'Facitlity already has the correct symbology marker color'
  },
  unknownTransformFacilityError: {
    code: UNKNOWN_TRANSFORM_FACILITY_ERROR,
    description: 'Reason for result status is unknown'
  },
  markerColorUpdated: {
    code: MAKER_COLOR_UPDATED,
    description: "The marker color was successfully updated,"
  }
};

export const ResultCodingsDescriptions = Object.values(ResultCodings).reduce((acc, value) => {
  return {
    ...acc,
    [value.code]: value.description
  };
}, {}) as any;

export type ResultCodes =
  | ErrorResultCodes
  | InfoResultCodes
  | SuccessResultCodes
  | WarningResultCodes;

export type SuccessResultDetail = { code?: ResultCodes | string; colorChange?: string };
export type FailureResultDetail = { code?: ResultCodes | string; recsAffected?: number };
export type ResultDetail = SuccessResultDetail | FailureResultDetail;

/** This is a generic interface that describes the output (or ... Result) of
 * a function.
 *
 * A function can either return Success, or Failure.  The intention is to make
 * it clear that both Success and Failure must be considered and handled.
 *
 * Inspired by https://khalilstemmler.com/articles/enterprise-typescript-nodejs/handling-errors-result-class/
 */
export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error: string;
  public detail?: ResultDetail;
  private _value: T;

  private constructor(isSuccess: boolean, error?: string, value?: T, detail?: ResultDetail) {
    if (isSuccess && error) {
      throw new Error(`InvalidOperation: A result cannot be 
          successful and contain an error`);
    }
    if (!isSuccess && !error) {
      throw new Error(`InvalidOperation: A failing result 
          needs to contain an error message`);
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.error = error!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this._value = value!;
    this.detail = detail;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Cant retrieve the value from a failed result.`);
    }

    return this._value;
  }

  public static ok<U>(value?: U, detail?: ResultCodes | string | ResultDetail): Result<U> {
    let resultDetail;
    if (typeof detail === 'string') {
      resultDetail = { code: detail };
    } else {
      resultDetail = detail;
    }
    return new Result<U>(true, undefined, value, resultDetail);
  }

  public static fail<U>(error: Error | string, detail?: ResultDetail | ResultCodes): Result<U> {
    let errorDesc = error as string
    if(typeof error == 'object'){
      errorDesc = getErrorDescription(error)
    }
    let resultDetail;
    if (typeof detail === 'string') {
      resultDetail = { code: detail };
    } else {
      resultDetail = detail;
    }
    return new Result<U>(false, errorDesc, undefined, resultDetail);
  }

  public static bubbleFailure<NewType, OldType>(result: Result<OldType>): Result<NewType> {
    // result should be a failure.
    if (!result.isFailure) {
      throw new Error('Invalid operation: you can only buble up a failed result');
    }
    return this.fail<NewType>(result.error, result.detail);
  }
}


function getErrorDescription(error: Error){
  const { name, message, cause } = error;
  const code = (cause as Record<string, unknown> | undefined)?.code as string | undefined
  const causeMessage = (cause as Record<string, unknown> | undefined)?.message as string | undefined
  const errorDetails = [];

  if (name) errorDetails.push(`Error Name: ${name}`);
  if (message) errorDetails.push(`Message: ${message}`);
  if (code) errorDetails.push(`Code: ${code}`);
  if (causeMessage) errorDetails.push(`Cause Message: ${causeMessage}`);


  return errorDetails.length > 0
    ? errorDetails.join(' | ')
    : "An unknown network error occurred.";
}
