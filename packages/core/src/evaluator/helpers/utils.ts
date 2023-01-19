import { markerColorAccessor } from '../../constants';
import { OnaApiService, upLoadMarkerColor } from '../../services/onaApi/services';
import { RegFormSubmission, LogFn, timestamp, uuid, Metric } from '../../helpers/types';
import {
  colorDeciderFactory,
  getMostRecentVisitDateForFacility,
  computeTimeToNow,
  createInfoLog,
  Result
} from '../../helpers/utils';

export async function transformFacility(
  service: OnaApiService,
  regFormSubmission: RegFormSubmission,
  regFormId: string,
  visitFormId: string,
  colorDecider: ReturnType<typeof colorDeciderFactory>,
  logger?: LogFn
) {
  let modifificationStatus: { modified: boolean; error: string | null } =
    createModificationStatus(false);

  const facilityId = regFormSubmission._id;
  const mostRecentVisitResult = await getMostRecentVisitDateForFacility(
    service,
    facilityId,
    visitFormId,
    logger
  );
  if (mostRecentVisitResult.isFailure) {
    modifificationStatus = createModificationStatus(false, mostRecentVisitResult);
    return modifificationStatus;
  }
  const mostRecentVisitDate = mostRecentVisitResult.getValue();
  const timeDifference = computeTimeToNow(mostRecentVisitDate);
  const color = colorDecider(timeDifference, regFormSubmission);
  if (color) {
    if (regFormSubmission[markerColorAccessor] === color) {
      modifificationStatus = createModificationStatus(false);
      logger?.(
        createInfoLog(
          `facility _id: ${facilityId} submission already has the correct color, no action needed`
        )
      );
    } else {
      const uploadMarkerResult = await upLoadMarkerColor(
        service,
        regFormId,
        regFormSubmission,
        color
      );
      if (uploadMarkerResult.isFailure) {
        modifificationStatus = createModificationStatus(false, uploadMarkerResult);
      } else {
        modifificationStatus = createModificationStatus(true);
      }
    }
  } else {
    const coloringResult = Result.fail('Unable to determine color to assign');
    modifificationStatus = createModificationStatus(false, coloringResult);
  }
  return modifificationStatus;
}

const createModificationStatus = (modified: boolean, result?: Result<unknown>) => {
  return {
    modified,
    error: result ? result.error : null
  };
};

export const createMetricFactory =
  (startTime: timestamp, configId: uuid) =>
  (
    evaluated: number,
    notModifiedWithoutError: number,
    notModifiedWithError: number,
    modified: number,
    totalSubmissions: number,
    end?: boolean
  ) => {
    return {
      configId,
      startTime,
      endTime: end ? Date.now() : null,
      evaluated,
      notModifiedWithoutError,
      notModifiedWithError,
      modified,
      totalSubmissions
    } as Metric;
  };
