import { IAcaadIntegrationTestContext } from './types';
import { createPerformanceTestContext } from './test-setup';

const TIMEOUT = 120 * 1_000;
jest.setTimeout(TIMEOUT);

describe('performance', () => {
  const SERVER_COUNT = 5;
  const COMPONENT_COUNT_PER_SERVER = 500;

  let intTestContext: IAcaadIntegrationTestContext;

  beforeAll(async () => {
    intTestContext = await createPerformanceTestContext(SERVER_COUNT, {
      sensorCount: COMPONENT_COUNT_PER_SERVER,
      switchCount: COMPONENT_COUNT_PER_SERVER,
      buttonCount: COMPONENT_COUNT_PER_SERVER
    });
    await intTestContext.startAllAsync();
  }, TIMEOUT);

  afterAll(async () => {
    await intTestContext.disposeAsync();
  }, TIMEOUT);

  it('should start successfully', async () => {
    const { instance, serviceAdapterMock } = intTestContext;

    const success = await instance.createMissingComponentsAsync();

    expect(serviceAdapterMock.createServerModelAsync).toHaveBeenCalledTimes(SERVER_COUNT);
    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(
      SERVER_COUNT * COMPONENT_COUNT_PER_SERVER * 3
    );
  });
});
