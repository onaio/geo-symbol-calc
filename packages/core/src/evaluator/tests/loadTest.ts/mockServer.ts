/* eslint-disable @typescript-eslint/no-explicit-any */
/** Creates a mock http server that is used as a test replacement for the onadata api instance  */
import {
  editSubmissionEndpoint,
  formEndpoint,
  numOfSubmissionsAccessor,
  submittedDataEndpoint
} from '../../../constants';
import { form3623, form3623Submissions, form3624Submissions } from '../fixtures/fixtures';
import { address, date, datatype } from 'faker';
import express from 'express';
import { trim, split } from 'lodash';

const app = express();

function generateRegForm(submissionsNum: number) {
  return {
    ...form3623,
    [numOfSubmissionsAccessor]: submissionsNum
  };
}

function generateRegFormSubmissions() {
  const defualtStructure = form3623Submissions[0];
  const uuid = datatype.uuid();
  return {
    ...defualtStructure,
    _id: datatype.uuid(), // to-do should be a number
    _uuid: uuid,
    'meta/instanceID': `uuid:${uuid}`,
    'meta/deprecatedID': `uuid:${datatype.uuid()}`,
    _geolocation: [address.longitude(), address.latitude()]
  };
}

function generateLotsRegFormSubmissions(submissionsNum: number) {
  const submissions: any[] = [];
  for (let i = 1; i <= submissionsNum; i++) {
    const submission = generateRegFormSubmissions();
    submissions.push(submission);
  }
  return submissions;
}

function generateSingleVisitSub(facilitId: number, geoLocation = {}) {
  const defualtStructure = form3624Submissions[0];
  const uuid = datatype.uuid();
  const dateOfVisit = date.past();
  const formatVisitDate = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDay()}`;
  return {
    ...defualtStructure,
    _id: datatype.uuid(),
    _uuid: uuid,
    facility: facilitId,
    'meta/instanceID': `uuid:${uuid}`,
    'meta/deprecatedID': `uuid:${datatype.uuid()}`,
    _geolocation: geoLocation,
    date_of_visit: formatVisitDate(dateOfVisit)
  };
}

const benchmark = 1000;

// start mock http server here.

app.get(`/${formEndpoint}/3623`, (req, res) => {
  res.send(generateRegForm(benchmark));
});

app.get(`/${submittedDataEndpoint}/3623`, (req, res) => {
  const pageSize = Number(req.query['page_size']);
  const subs = generateLotsRegFormSubmissions(pageSize);
  res.send(subs);
});

app.get(`/${submittedDataEndpoint}/3624`, (req, res) => {
  const query = req.query.query as string;
  const QueryParts = split(query, ':');
  const facilityId = Number(trim(QueryParts[1], '} '));
  const visitMockSubmission = generateSingleVisitSub(facilityId);
  res.send([visitMockSubmission]);
});

app.post(`/${editSubmissionEndpoint}`, (req, res) => {
  res.send({});
});

export { app };
