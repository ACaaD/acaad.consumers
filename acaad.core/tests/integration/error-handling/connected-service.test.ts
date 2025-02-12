import { IAcaadIntegrationTestContext } from '../types';
import { ComponentManager } from '../../../src';
import { createIntegrationTestContext } from '../framework/test-setup';

import { IConnectedServiceAdapter, ComponentType } from '@acaad/abstractions';

import { MockCsLogger } from '../mocks/MockCsLogger';
import { sanityCheckGenerator } from '../shared-flows';

describe('connected service error handling', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: IConnectedServiceAdapter;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    await intTestContext.startMockServersAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('sanity check', async () => {
    await sanityCheckGenerator(intTestContext)();
  });
});
