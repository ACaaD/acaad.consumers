import { IAcaadIntegrationTestContext, IStateObserver } from './types';
import { AcaadOutcome, ComponentManager, ComponentType, IConnectedServiceAdapter } from '../../src';
import { createIntegrationTestContext } from './test-setup';
import { delay } from '@acaad/testing';
import { ComponentCommandOutcomeEvent } from '../../src/model/events/ComponentCommandOutcomeEvent';
import { TestEventFactory } from './factories/test-event-factory';

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

    await intTestContext.startAllAsync();
    await instance.createMissingComponentsAsync();

    await stateObserver.waitForSignalRClient();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should drop unhandled event', async () => {
    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:onUnhandledEvent');

    await intTestContext.signalrMocks[0].pushEvent({ abc: 'def' });

    await checkpoint;

    expect(serviceAdapterMock.onUnhandledEventAsync).toHaveBeenCalledTimes(1);
  });

  it('should skip unmapped component', async () => {
    const event = TestEventFactory.createComponentOutcomeEvent('unmapped-component');

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:onUnmappedComponentEvent');

    await intTestContext.signalrMocks[0].pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(1);
  });

  it('should process sensor component', async () => {
    const event = TestEventFactory.createComponentOutcomeEvent('sensor-0');

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:updateComponentState');

    await intTestContext.signalrMocks[0].pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(0);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(1);
  });
});
