export const submittedDataEndpoint = 'api/v1/data' as const;
export const formEndpoint = 'api/v1/forms' as const;
export const editSubmissionEndpoint = 'api/v1/submissions' as const;

// field accessor names
/** on the facility registration form; accessor that is updated with symbol color */
export const markerColorAccessor = 'marker-color';
/** on the visit form; accessor of time when a visit occurred */
export const dateOfVisitAccessor = 'endtime';
/** on the facility registration form; accessor for field that informs on the priority level of a facility */
export const priorityLevelAccessor = 'priority_level';
/** on the facility registration form; informs on how many submissions(facilities) that have been created */
export const numOfSubmissionsAccessor = 'num_of_submissions';
/** uniquely identifies a submission; on the facility registration form, it represents a created facility */
export const submissionIdAccessor = "_id";

// magic strings
export const AbortErrorName = 'AbortError';
