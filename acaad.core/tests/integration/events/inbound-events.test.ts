import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { createIntegrationTestContext } from '../framework/test-setup';
import { TestEventFactory } from '../factories/test-event-factory';

import { IConnectedServiceAdapter, ComponentType } from '@acaad/abstractions';

describe('inbound events', () => {
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
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should drop unhandled event', async () => {
    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:onUnhandledEvent');

    await intTestContext.getRandomServer().signalrServer.pushEvent({ abc: 'def' });

    await checkpoint;

    expect(serviceAdapterMock.onUnhandledEventAsync).toHaveBeenCalledTimes(1);
  });

  it('should skip unmapped component', async () => {
    const event = TestEventFactory.createComponentOutcomeEvent('unmapped-component');

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:onUnmappedComponentEvent');

    await intTestContext.getRandomServer().signalrServer.pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(1);
  });

  it('should process sensor component', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndCd = rndServer.getRandomComponent(ComponentType.Sensor);

    const event = TestEventFactory.createComponentOutcomeEvent(rndCd.toIdentifier());

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:updateComponentState');

    await rndServer.signalrServer.pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(0);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(1);
  });
});
