import { IAcaadIntegrationTestContext } from './types';
import { ComponentManager } from '../../src';
import { createIntegrationTestContext } from './test-setup';

import { IConnectedServiceAdapter } from '@acaad/abstractions';

describe('server metadata creation', () => {
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

  it('should create server model', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createServerModelAsync).toHaveBeenCalledTimes(1);
  });
});
