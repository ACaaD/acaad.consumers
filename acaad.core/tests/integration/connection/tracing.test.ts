import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { createIntegrationTestContext } from '../framework/test-setup';
import { getRequestsFromSpan } from '../shared-flows';
import { Option } from 'effect';
import { ComponentType, ChangeType } from '@acaad/abstractions';
import { MockCsLogger } from '../mocks/MockCsLogger';

describe('tracing', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let stateObserver: IStateObserver;
  let throwAwayInstance: ComponentManager | undefined;

  beforeAll(async () => {
    const logger = new MockCsLogger();
    intTestContext = await createIntegrationTestContext(3, undefined, logger);
    instance = intTestContext.instance;
    stateObserver = intTestContext.stateObserver;

    intTestContext.enableRequestTracking();
    await intTestContext.startAllAsync();
    await instance.createMissingComponentsAsync();
  });

  afterEach(async () => {
    intTestContext.clearTrackedRequests();

    if (throwAwayInstance) {
      await throwAwayInstance.shutdownAsync();
      // eslint-disable-next-line require-atomic-updates
      throwAwayInstance = undefined;
    }
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  describe('metadata sync', () => {
    it('should append traceParent header', async () => {
      const checkpoint = stateObserver.waitForSpanAsync('acaad:sync:query:api');

      throwAwayInstance = intTestContext.getThrowAwayInstance();
      await throwAwayInstance.createMissingComponentsAsync();

      const trackedRequests = await getRequestsFromSpan(intTestContext, checkpoint);

      expect(trackedRequests.length).toBe(1);
      expect(trackedRequests[0].url === '/openapi/v1.json');
    });
  });

  const checkForComponentType = async (
    componentType: ComponentType,
    changeType: ChangeType,
    value?: unknown
  ) => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(componentType);

    const checkpoint = stateObserver.waitForSpanAsync('acaad:events:outbound:api');
    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      changeType,
      value !== undefined ? Option.some(value) : Option.none<unknown>()
    );

    expect(result).toBe(true);
    const trackedRequests = await getRequestsFromSpan(intTestContext, checkpoint);

    expect(trackedRequests.length).toBe(1);
    expect(trackedRequests[0].url).toMatch(rndComponent.toIdentifier());
  };

  describe('outbound events', () => {
    it('should append traceParent header for sensor component', async () => {
      await checkForComponentType(ComponentType.Sensor, 'query');
    });

    it('should append traceParent header for button component', async () => {
      await checkForComponentType(ComponentType.Button, 'action');
    });

    it('should append traceParent header for switch component (query)', async () => {
      await checkForComponentType(ComponentType.Switch, 'query');
    });

    it('should append traceParent header for switch component (action, val=true)', async () => {
      await checkForComponentType(ComponentType.Switch, 'action', true);
    });

    it('should append traceParent header for switch component (action, val=false)', async () => {
      await checkForComponentType(ComponentType.Switch, 'action', false);
    });
  });

  describe('inbound events', () => {
    it('should reuse traceParent provided by event', async () => {});
  });
});
