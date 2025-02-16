import { IAcaadIntegrationTestContext } from '../types';
import { createIntegrationTestContext } from '../framework/test-setup';
import { ComponentManager } from '../../../src';
import { ComponentType, ComponentDescriptor } from '@acaad/abstractions';
import { Option } from 'effect';

describe('outbound events', () => {
  const EXPECTED_RESULT = true;

  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext(3);
    instance = intTestContext.instance;

    await intTestContext.startAllAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should call API for sensor component', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Sensor);

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'query',
      Option.none<unknown>()
    );

    expect(result).toBe(EXPECTED_RESULT);
  });

  it('should call API for button component', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Button);

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'action',
      Option.none<unknown>()
    );

    expect(result).toBe(EXPECTED_RESULT);
  });

  it('should call API for switch component (query)', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Switch);

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'query',
      Option.none<unknown>()
    );

    expect(result).toBe(EXPECTED_RESULT);
  });

  it('should call API for switch component (turn on)', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Switch);

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'action',
      Option.some<boolean>(false)
    );

    expect(result).toBe(EXPECTED_RESULT);
  });

  it('should call API for switch component (turn off)', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Switch);

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'action',
      Option.some<boolean>(true)
    );

    expect(result).toBe(EXPECTED_RESULT);
  });

  it('should not process sensor with type action', async () => {
    const rndServer = intTestContext.getRandomServer();
    const rndComponent = rndServer.getRandomComponent(ComponentType.Sensor);

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      rndComponent,
      'action',
      Option.some<boolean>(true)
    );

    expect(result).toBe(false);
  });

  it('should drop unmapped component with type query', async () => {
    const rndServer = intTestContext.getRandomServer();
    const unmappedComponent = new ComponentDescriptor('does-not-exist');

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      unmappedComponent,
      'query',
      Option.some<boolean>(true)
    );

    expect(result).toBe(false);
    expect(intTestContext.logger.logWarning).toHaveBeenCalledWith(
      `Could not find component by host ${rndServer.getHost().friendlyName} and descriptor ${unmappedComponent.toIdentifier()}. This is either a problem in the connected service or the component is not yet synced.`
    );
  });

  it('should drop unmapped component with type action', async () => {
    const rndServer = intTestContext.getRandomServer();
    const unmappedComponent = new ComponentDescriptor('does-not-exist');

    const result = await instance.handleOutboundStateChangeAsync(
      rndServer.getHost(),
      unmappedComponent,
      'action',
      Option.some<boolean>(true)
    );

    expect(result).toBe(false);
    expect(intTestContext.logger.logWarning).toHaveBeenCalledWith(
      `Could not find component by host ${rndServer.getHost().friendlyName} and descriptor ${unmappedComponent.toIdentifier()}. This is either a problem in the connected service or the component is not yet synced.`
    );
  });
});
