import { IAcaadIntegrationTestContext } from './types';
import { ComponentManager } from '../../src';
import { createIntegrationTestContext, createPerformanceTestContext } from './framework/test-setup';

import { IConnectedServiceAdapter } from '@acaad/abstractions';

const TIMEOUT = 120 * 1_000;

describe('server metadata creation', () => {
  // Let's go with a modest 2.500 servers here (which is already insane)
  // The problem is that each server will spawn a signalR client, so we're running out of (client) ports quite quickly.
  const ACTUAL_SERVER_COUNT = 5;
  const SERVER_MULTIPLIER = 500;
  const EXPECTED_SERVER_METADATA_COUNT = ACTUAL_SERVER_COUNT * SERVER_MULTIPLIER;

  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: IConnectedServiceAdapter;

  beforeAll(async () => {
    intTestContext = await createPerformanceTestContext(
      ACTUAL_SERVER_COUNT,
      {
        sensorCount: 1,
        buttonCount: 1,
        switchCount: 1
      },
      undefined,
      SERVER_MULTIPLIER
    );

    instance = intTestContext.instance;
    serviceAdapterMock = intTestContext.serviceAdapterMock;

    await intTestContext.startMockServersAsync();
  }, TIMEOUT);

  afterAll(async () => {
    await intTestContext.disposeAsync();
  }, TIMEOUT);

  // This test is broken currently :(
  it(
    'should create server model',
    async () => {
      await intTestContext.startAndWaitForSignalR('1 minute');

      // expect(serviceAdapterMock.onServerConnectedAsync).toHaveBeenCalledTimes(EXPECTED_SERVER_METADATA_COUNT);
      expect(serviceAdapterMock.createServerModelAsync).toHaveBeenCalledTimes(EXPECTED_SERVER_METADATA_COUNT);
    },
    TIMEOUT
  );
});
