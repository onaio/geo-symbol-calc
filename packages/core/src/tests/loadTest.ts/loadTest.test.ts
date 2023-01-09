import { createConfigs } from '../fixtures/fixtures';
import { evaluate } from '../../evaluator';
import { app } from './mockServer';

const port = 3001;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let server: any;

beforeAll(() => {
  server = app.listen(port);
});

afterAll(() => {
  server?.close();
});

test('load test on submissions', async () => {
  const loggerMock = jest.fn();
  const configs = createConfigs(loggerMock);
  const thisConfigs = {
    ...configs,
    baseUrl: `http://localhost:${port}`
  };

  console.time('[time benchmark] took:');
  await evaluate(thisConfigs)
    .catch((err: Error) => {
      throw err;
    })
    .finally(() => {
      console.time('[time benchmark] took:');
    });
}, 120000);
