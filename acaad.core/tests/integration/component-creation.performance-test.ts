import { IAcaadIntegrationTestContext } from './types';
import { createPerformanceTestContext } from './framework/test-setup';

const TIMEOUT = 120 * 1_000;
jest.setTimeout(TIMEOUT);

describe('component creation', () => {
  const SERVER_COUNT = 5;
  const COMPONENT_COUNT_PER_SERVER = 500;
  const EXPECTED_COMPONENT_COUNT = SERVER_COUNT * COMPONENT_COUNT_PER_SERVER * 3;

  let intTestContext: IAcaadIntegrationTestContext;

  beforeAll(async () => {
    intTestContext = await createPerformanceTestContext(SERVER_COUNT, {
      sensorCount: COMPONENT_COUNT_PER_SERVER,
      switchCount: COMPONENT_COUNT_PER_SERVER,
      buttonCount: COMPONENT_COUNT_PER_SERVER,
      suppressComponentEndpoints: true
    });
    await intTestContext.startAllAsync();
  }, TIMEOUT);

  afterAll(async () => {
    await intTestContext.disposeAsync();
  }, TIMEOUT);

  it(`should sync ${EXPECTED_COMPONENT_COUNT} components`, async () => {
    const { instance, serviceAdapterMock } = intTestContext;

    const success = await instance.createMissingComponentsAsync();

    expect(serviceAdapterMock.createServerModelAsync).toHaveBeenCalledTimes(SERVER_COUNT);
    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(EXPECTED_COMPONENT_COUNT);
  });
});
