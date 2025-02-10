import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './test-setup';
import { ComponentManager } from '../../src';
import { Option } from 'effect';

import { IConnectedServiceAdapter, Component, ChangeType } from '@acaad/abstractions';

describe('outbound events', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    instance = intTestContext.instance;

    await intTestContext.startAllAsync();
    await instance.createMissingComponentsAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should call API for sensor component', async () => {
    // const sensor: Component = { };

    await instance.handleOutboundStateChangeAsync(null as any, null as any, 'query', Option.none<unknown>());
  });

  it('should call API for button component', async () => {});

  it('should call API for switch component', async () => {});
});
