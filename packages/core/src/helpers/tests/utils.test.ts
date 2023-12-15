import { createConfigs, form3623Submissions } from '../../evaluator/tests/fixtures/fixtures';
import { LogMessageLevels, RegFormSubmission } from '../types';
import {
  colorDeciderFactory,
  createDebugLog,
  createErrorLog,
  createInfoLog,
  createVerboseLog,
  createWarnLog
} from '../utils';

it('test logger creation utils', () => {
  const message = 'log message';
  const table = [
    [createDebugLog, { level: LogMessageLevels.DEBUG, message }],
    [createErrorLog, { level: LogMessageLevels.ERROR, message }],
    [createWarnLog, { level: LogMessageLevels.WARN, message }],
    [createInfoLog, { level: LogMessageLevels.INFO, message }],
    [createVerboseLog, { level: LogMessageLevels.VERBOSE, message }]
  ];
  table.forEach(([fn, expected]) => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    expect((fn as Function)(message)).toEqual(expected);
  });
});

describe('colorDecider', () => {
  const logFn = jest.fn();
  const configs = createConfigs(logFn);
  const colorDecider = colorDeciderFactory(configs.symbolConfig, logFn);

  it('Marks very high priotiry facilities correctly', () => {
    const submission = form3623Submissions[0] as RegFormSubmission;
    expect(colorDecider(0, submission).getValue()).toEqual('green');
    expect(colorDecider(2, submission).getValue()).toEqual('green');
    expect(colorDecider(3, submission).getValue()).toEqual('green');
    expect(colorDecider(4, submission).getValue()).toEqual('yellow');
    expect(colorDecider(5, submission).getValue()).toEqual('red');
    expect(colorDecider(99999, submission).getValue()).toEqual('red');
  });

  it('Marks high priotiry facilities correctly', () => {
    const submission = form3623Submissions[1] as RegFormSubmission;
    expect(colorDecider(0, submission).getValue()).toEqual('green');
    expect(colorDecider(6, submission).getValue()).toEqual('green');
    expect(colorDecider(7, submission).getValue()).toEqual('green');
    expect(colorDecider(8, submission).getValue()).toEqual('red');
    expect(colorDecider(9, submission).getValue()).toEqual('red');
    expect(colorDecider(99999, submission).getValue()).toEqual('red');
  });

  it('Marks medium priotiry facilities correctly', () => {
    const submission = form3623Submissions[3] as RegFormSubmission;
    expect(colorDecider(0, submission).getValue()).toEqual('green');
    expect(colorDecider(13, submission).getValue()).toEqual('green');
    expect(colorDecider(14, submission).getValue()).toEqual('green');
    expect(colorDecider(15, submission).getValue()).toEqual('red');
    expect(colorDecider(16, submission).getValue()).toEqual('red');
    expect(colorDecider(99999, submission).getValue()).toEqual('red');
  });

  it('Marks low priotiry facilities correctly', () => {
    const submission = form3623Submissions[2] as RegFormSubmission;
    expect(colorDecider(0, submission).getValue()).toEqual('green');
    expect(colorDecider(29, submission).getValue()).toEqual('green');
    expect(colorDecider(30, submission).getValue()).toEqual('green');
    expect(colorDecider(31, submission).getValue()).toEqual('red');
    expect(colorDecider(32, submission).getValue()).toEqual('red');
    expect(colorDecider(99999, submission).getValue()).toEqual('red');
  });
});
