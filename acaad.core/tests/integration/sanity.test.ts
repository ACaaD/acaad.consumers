import { IAcaadIntegrationTestContext } from './types';
import { createIntegrationTestContext } from './test-setup';

describe('sanity checks', () => {
  let intTestContext: IAcaadIntegrationTestContext;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    await intTestContext.startAllAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should start successfully', async () => {
    const { instance } = intTestContext;

    expect(instance).not.toBeNull();
  });
});
