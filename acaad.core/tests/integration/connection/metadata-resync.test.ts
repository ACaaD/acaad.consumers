import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { Mock } from 'ts-jest-mocker';
import { createIntegrationTestContext } from '../framework/test-setup';
import { IConnectedServiceAdapter } from '@acaad/abstractions';
import { MockCsLogger } from '../mocks/MockCsLogger';
import { sanityCheckGenerator } from '../shared-flows';

describe('metadata resync', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapter: Mock<IConnectedServiceAdapter>;
  let stateObserver: IStateObserver;
  let throwAwayInstance: ComponentManager | undefined;

  beforeAll(async () => {
    const logger = new MockCsLogger();
    intTestContext = await createIntegrationTestContext(3, undefined, logger);

    // intTestContext = await createIntegrationTestContext(3);

    instance = intTestContext.instance;
    serviceAdapter = intTestContext.serviceAdapterMock;
    stateObserver = intTestContext.stateObserver;

    await intTestContext.startMockServersAsync();
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

  it('sanity check', async () => {
    throwAwayInstance = intTestContext.getThrowAwayInstance();
    await sanityCheckGenerator(intTestContext, throwAwayInstance)();
  });

  it('should create missing metadata on reconnect', async () => {
    // cs.syncMetadataAfter
    // if(cs.shouldSyncMetadataOnServerConnect && (cs.syncMetadataAfter() || cs.shouldSyncMetadata(host))
  });

  it('should debounce metadata creation', async () => {
    throwAwayInstance = intTestContext.getThrowAwayInstance();
    serviceAdapter.shouldSyncMetadataOnServerConnect.mockReturnValue(true);

    await instance.startAsync();

    // Count number of spans (fwk extension)
  });
});
