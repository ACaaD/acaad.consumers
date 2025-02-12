import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './framework/test-setup';
import { MockCsLogger } from './mocks/MockCsLogger';
import { sanityCheckGenerator } from './shared-flows';

describe('sanity checks', () => {
  let intTestContext: IAcaadIntegrationTestContext;

  beforeAll(async () => {
    const logger = new MockCsLogger();
    intTestContext = await createIntegrationTestContext(undefined, undefined, logger);

    await intTestContext.startMockServersAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should log process details', async () => {
    await sanityCheckGenerator(intTestContext)();
  });
});
