import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './test-setup';
import { ComponentManager } from '../../src';

import { IConnectedServiceAdapter } from '@acaad/abstractions';

describe('component creation', () => {
  let intTestContext: IAcaadIntegrationTestContext;

  afterEach(async () => {
    await intTestContext.disposeAsync();
  });

  it('should sync sensor component', async () => {
    intTestContext = await createIntegrationTestContext(1, {
      sensorCount: 1
    });
    await intTestContext.startAllAsync();

    const result = await intTestContext.instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(intTestContext.serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync switch component', async () => {
    intTestContext = await createIntegrationTestContext(1, {
      switchCount: 1
    });
    await intTestContext.startAllAsync();

    const result = await intTestContext.instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(intTestContext.serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync button component', async () => {
    intTestContext = await createIntegrationTestContext(1, {
      buttonCount: 1
    });
    await intTestContext.startAllAsync();

    const result = await intTestContext.instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(intTestContext.serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });
});
