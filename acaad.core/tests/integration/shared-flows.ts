import { IAcaadIntegrationTestContext } from './types';
import { Option } from 'effect';
import { TestEventFactory } from './factories/test-event-factory';
import { ComponentType } from '@acaad/abstractions';
import { ComponentManager } from '../../src';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';

export async function getRequestsFromSpan(
  intTestContext: IAcaadIntegrationTestContext,
  spanPrm: Promise<ReadableSpan>
) {
  const spanDetails = await spanPrm;

  const traceId = spanDetails.spanContext().traceId;
  const spanId = spanDetails.spanContext().spanId;

  return intTestContext.getTrackedRequests(traceId, spanId);
}

export function sanityCheckGenerator(
  intTestContext: IAcaadIntegrationTestContext,
  instanceToUse?: ComponentManager
) {
  return async () => {
    const { instance: instanceFromContext, stateObserver, serviceAdapterMock } = intTestContext;

    const instance = instanceToUse ?? instanceFromContext;

    const componentCreationResult = await instance.createMissingComponentsAsync();

    const signalrCheckpoint = intTestContext.stateObserver.waitForSignalRClient();
    await instance.startAsync();
    await signalrCheckpoint;

    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Sensor);

    const outboundChangeResult = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'query',
      Option.none<unknown>()
    );

    const inboundEvent = TestEventFactory.createComponentOutcomeEvent(rndComponent.toIdentifier());
    const checkpoint = stateObserver.waitForSpanAsync('acaad:cs:updateComponentState');

    await intTestContext.getRandomServer().signalrServer.pushEvent(inboundEvent);
    await checkpoint;

    await instance.shutdownAsync();

    expect(componentCreationResult).toBe(true);
    expect(outboundChangeResult).toBe(true);
    expect(serviceAdapterMock.updateComponentStateAsync).toHaveBeenCalledTimes(1);
  };
}
