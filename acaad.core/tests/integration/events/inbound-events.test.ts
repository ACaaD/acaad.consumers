import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { createIntegrationTestContext } from '../framework/test-setup';
import { TestEventFactory } from '../factories/test-event-factory';

import { IConnectedServiceAdapter, ComponentType } from '@acaad/abstractions';
import { ComponentDescriptor } from '@acaad/abstractions';
import { InboundStateUpdate } from '@acaad/abstractions/src/model/InboundStateUpdate';
import { Option } from 'effect';

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
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(0);
  });

  it('should skip unmapped component', async () => {
    const event = TestEventFactory.createComponentOutcomeEvent('unmapped-component');

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:onUnmappedComponentEvent');

    await intTestContext.getRandomServer().signalrServer.pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(1);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(0);
  });

  it('should process sensor component', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndCd = rndServer.getRandomComponent(ComponentType.Sensor);

    const expectedOutcomeRaw = 'the-original-outcome';
    const event = TestEventFactory.createComponentOutcomeEvent(
      rndCd.toIdentifier(),
      undefined,
      expectedOutcomeRaw
    );

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:updateComponentState');

    await rndServer.signalrServer.pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(0);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(1);

    const expectedStateUpdate: InboundStateUpdate = {
      originalOutcome: event.outcome,
      determinedTargetState: expectedOutcomeRaw,
      metadata: expect.anything()
    };

    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledWith(
      expect.any(ComponentDescriptor),
      expectedStateUpdate,
      expect.anything() // AbortSignal
    );
  });

  it('should map switch component to on state (value=true)', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndCd = rndServer.getRandomComponent(ComponentType.Switch);

    const event = TestEventFactory.createSwitchOutcomeEventForState(rndCd, true);

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:updateComponentState');

    await rndServer.signalrServer.pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(0);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(1);

    const expectedStateUpdate: InboundStateUpdate = {
      originalOutcome: event.outcome,
      determinedTargetState: true,
      metadata: expect.anything()
    };

    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledWith(
      expect.any(ComponentDescriptor),
      expectedStateUpdate,
      expect.anything() // AbortSignal
    );
  });

  it('should map switch component to off state (value=false)', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndCd = rndServer.getRandomComponent(ComponentType.Switch);

    const event = TestEventFactory.createSwitchOutcomeEventForState(rndCd, false);

    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:updateComponentState');

    await rndServer.signalrServer.pushEvent(event);
    await checkpoint;

    expect(serviceAdapterMock.onUnmappedComponentEventAsync).toHaveBeenCalledTimes(0);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(1);

    const expectedStateUpdate: InboundStateUpdate = {
      originalOutcome: event.outcome,
      determinedTargetState: false,
      metadata: expect.anything()
    };

    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledWith(
      expect.any(ComponentDescriptor),
      expectedStateUpdate,
      expect.anything() // AbortSignal
    );
  });
});
