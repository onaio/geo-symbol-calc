import { markerColorAccessor } from '../../constants';
import { OnaApiService, upLoadMarkerColor } from '../../services/onaApi/services';
import { RegFormSubmission, LogFn, timestamp, uuid, Metric } from '../../helpers/types';
import {
  colorDeciderFactory,
  getMostRecentVisitDateForFacility,
  computeTimeToNow,
  createInfoLog
} from '../../helpers/utils';
import { Result } from '../../helpers/Result';

/** Given a facility record, fetches its most recent visit, evaluates the marker color
 * and edits the facility record with the marker color
 * @param service - to make the api calls.
 * @param regFormSubmission - the facility record.
 * @param regFormId - id for the registration form
 * @param visitFormId - id for the visit form.
 * @param colorDecider - callback function that given a days duration determines the color to assign to facility
 * @param logger - callback function to log
 */
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

/** Factory function that creates a status representing if/why facility was modified
 * @param modified - whether facility was modified.
 * @param result - why facility was or not modified.
 */
const createModificationStatus = (modified: boolean, result?: Result<unknown>) => {
  return {
    modified,
    error: result ? result.error : null
  };
};

/** creates a function that abstracts creating metric objects. Metric objects represent the
 * intermediary or final status of a running pipeline.
 */
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
