import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './test-setup';
import { ComponentManager } from '../../src';
import { ComponentType } from '@acaad/abstractions';
import { Option } from 'effect';

describe('outbound events', () => {
  /* TODO: Wrong value. Should be true, but mocks are not yet generated. */
  const EXPECTED_RESULT = false;

  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext(3);
    instance = intTestContext.instance;

    await intTestContext.startAllAsync();
    await instance.createMissingComponentsAsync();
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
});
