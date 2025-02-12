import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './framework/test-setup';
import { beforeEach } from 'node:test';

describe('component creation', () => {
  let sensorTestContext: IAcaadIntegrationTestContext;
  let buttonTestContext: IAcaadIntegrationTestContext;
  let switchTestContext: IAcaadIntegrationTestContext;

  afterAll(async () => {
    await Promise.all(
      [sensorTestContext, buttonTestContext, switchTestContext].map((ctx) => ctx.disposeAsync())
    );
  });

  beforeAll(async () => {
    [sensorTestContext, buttonTestContext, switchTestContext] = await Promise.all([
      createIntegrationTestContext(1, {
        sensorCount: 1
      }),
      createIntegrationTestContext(1, {
        buttonCount: 1
      }),
      createIntegrationTestContext(1, {
        switchCount: 1
      })
    ]);

    await Promise.all(
      [sensorTestContext, buttonTestContext, switchTestContext].map((ctx) => ctx.startAllAsync())
    );
  });

  it('should sync sensor component', async () => {
    const result = await sensorTestContext.instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(sensorTestContext.serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync switch component', async () => {
    const result = await buttonTestContext.instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(buttonTestContext.serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync button component', async () => {
    const result = await switchTestContext.instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(switchTestContext.serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });
});
