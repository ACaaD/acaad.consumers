import { IAcaadIntegrationTestContext } from './types';
import { ComponentManager, IConnectedServiceAdapter } from '../../src';
import { createIntegrationTestContext } from './test-setup';
import { delay } from '@acaad/testing';

describe('signalr connection', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: IConnectedServiceAdapter;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    instance = intTestContext.instance;
    serviceAdapterMock = intTestContext.serviceAdapterMock;

    await intTestContext.startMockServersAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should raise signalr server connected event', async () => {
    await intTestContext.instance.startAsync();

    await delay(100);

    expect(serviceAdapterMock.onServerConnectedAsync).toHaveBeenCalledTimes(1);
  });
});
