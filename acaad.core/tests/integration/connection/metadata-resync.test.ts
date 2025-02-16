import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { Mock } from 'ts-jest-mocker';
import { IConnectedServiceAdapter, AcaadServerConnectedEvent } from '@acaad/abstractions';
import { setupConnectedServiceMock } from '../mocks/MockServiceAdapter';
import { createIntegrationTestContext } from '../framework/test-setup';
import { infinity } from 'effect/Duration';

describe('metadata resync', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapter: Mock<IConnectedServiceAdapter>;
  let stateObserver: IStateObserver;
  let throwAwayInstance: ComponentManager | undefined;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext(5);

    instance = intTestContext.instance;
    serviceAdapter = intTestContext.serviceAdapterMock;
    stateObserver = intTestContext.stateObserver;

    await intTestContext.startMockServersAsync();
    await intTestContext.startAndWaitForSignalR();
  });

  beforeEach(() => {
    setupConnectedServiceMock(intTestContext);

    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(false);
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  afterEach(async () => {
    if (throwAwayInstance) {
      await throwAwayInstance.shutdownAsync();
      // eslint-disable-next-line require-atomic-updates
      throwAwayInstance = undefined;
    }
  });

  // it('sanity check', async () => {
  //   throwAwayInstance = intTestContext.getThrowAwayInstance();
  //   await sanityCheckGenerator(intTestContext, throwAwayInstance)();
  // });

  const startRandomServerAndWaitAsync = async (itc: IAcaadIntegrationTestContext) => {
    const rndServer = itc.getRandomServer();
    const event = new AcaadServerConnectedEvent(rndServer.getHost());

    const checkpoint = stateObserver.waitForSignalRClient();
    const qRes = itc.instance._eventQueue.unsafeOffer(event);
    expect(qRes).toBe(true);
    await checkpoint;
  };

  it('should not sync metadata if the feature is not enabled', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(false);

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it('should not sync metadata if host callback returns false', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue('1 hour');

    const hostCallbackMock = serviceAdapter.shouldSyncMetadata as jest.Mock;
    hostCallbackMock.mockReturnValue(false);

    await startRandomServerAndWaitAsync(intTestContext);

    expect(hostCallbackMock).toHaveBeenCalledTimes(1);
    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it('should sync metadata if host callback returns true', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue('1 hour');

    const hostCallbackMock = serviceAdapter.shouldSyncMetadata as jest.Mock;
    hostCallbackMock.mockReturnValue(true);

    await startRandomServerAndWaitAsync(intTestContext);

    expect(hostCallbackMock).toHaveBeenCalledTimes(1);
    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync metadata if sync-interval elapsed', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.shouldSyncMetadata as jest.Mock).mockReturnValue(false);

    const getIntervalMock = serviceAdapter.getMetadataSyncInterval as jest.Mock;
    getIntervalMock.mockReturnValue('1 nano');

    await startRandomServerAndWaitAsync(intTestContext);

    expect(getIntervalMock).toHaveBeenCalledTimes(1);
    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should not sync if both callbacks return false', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.shouldSyncMetadata as jest.Mock).mockReturnValue(false);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue('5 hours');

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it('should sync if both callbacks return true', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.shouldSyncMetadata as jest.Mock).mockReturnValue(true);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue('1 nano');

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should ignore non-parseable duration', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.shouldSyncMetadata as jest.Mock).mockReturnValue(false);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue('this-is-not-a-duration');

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it('should not sync if per-host callback is undefined', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue('5 hours');
    serviceAdapter.shouldSyncMetadata = undefined;

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it('should not sync if interval callback is undefined', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.shouldSyncMetadata as jest.Mock).mockReturnValue(false);
    serviceAdapter.getMetadataSyncInterval = undefined;

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it.only('should not sync on infinity interval', async () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    (serviceAdapter.getMetadataSyncInterval as jest.Mock).mockReturnValue(infinity);
    serviceAdapter.shouldSyncMetadata = undefined;

    await startRandomServerAndWaitAsync(intTestContext);

    expect(serviceAdapter.createServerModelAsync).toHaveBeenCalledTimes(0);
  });

  it('should debounce metadata creation', async () => {
    // TODO Next PR :)
    // throwAwayInstance = intTestContext.getThrowAwayInstance();
    // serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    //
    // await instance.startAsync();
    // Count number of spans (fwk extension)
  });

  it('should throw if connected-service adapter is incorrectly implemented', () => {
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);
    serviceAdapter.shouldSyncMetadata = undefined;
    serviceAdapter.getMetadataSyncInterval = undefined;

    expect(intTestContext.getThrowAwayInstance).toThrow(
      "Programming error: If 'shouldSyncMetadataOnServerConnect' returns true, either 'getMetadataSyncInterval' or 'shouldSyncMetadata' MUST be implemented."
    );
  });
});
