import { IAcaadIntegrationTestContext, IStateObserver } from './types';
import { ComponentManager, IConnectedServiceAdapter } from '../../src';
import { createIntegrationTestContext } from './test-setup';
import { delay } from '@acaad/testing';

describe('signalr connection', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: IConnectedServiceAdapter;
  let stateObserver: IStateObserver;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    instance = intTestContext.instance;
    serviceAdapterMock = intTestContext.serviceAdapterMock;
    stateObserver = intTestContext.stateObserver;

    await intTestContext.startMockServersAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should raise signalr server connected event', async () => {
    await intTestContext.instance.startAsync();

    await stateObserver.waitForSignalRClient();

    expect(serviceAdapterMock.onServerConnectedAsync).toHaveBeenCalledTimes(1);
  });
});
