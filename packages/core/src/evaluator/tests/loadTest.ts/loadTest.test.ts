import { app } from './mockServer';
import { PipelinesController } from '../../pipelinesController';
import { ConfigRunner } from '../../configRunner';
import { createConfigs } from '../fixtures/fixtures';

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
  const pipelinesController = new PipelinesController(() => [thisConfigs]);
  const configRunner = pipelinesController.getPipelines(configs.uuid) as ConfigRunner;
  await configRunner.transform()
    .catch((err: Error) => {
      throw err;
    })
    .finally(() => {
      console.time('[time benchmark] took:');
    });
}, 120000);
