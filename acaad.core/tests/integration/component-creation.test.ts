import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './test-setup';
import { ComponentManager } from '../../src';

import { IConnectedServiceAdapter } from '@acaad/abstractions';

describe('component creation', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: IConnectedServiceAdapter;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    instance = intTestContext.instance;
    serviceAdapterMock = intTestContext.serviceAdapterMock;

    await intTestContext.startAllAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should sync sensor component', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync switch component', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync button component', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });
});
