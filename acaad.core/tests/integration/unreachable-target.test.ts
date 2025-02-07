import { IAcaadIntegrationTestContext } from './types';
import { ComponentManager, IConnectedServiceAdapter, ICsLogger } from '../../src';
import { createIntegrationTestContext } from './test-setup';
import { Mock } from 'ts-jest-mocker';

describe('signalr connection', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: IConnectedServiceAdapter;
  let loggerMock: Mock<ICsLogger>;

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();
    instance = intTestContext.instance;
    serviceAdapterMock = intTestContext.serviceAdapterMock;
    loggerMock = intTestContext.loggerMock;

    await intTestContext.startAllAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  it('should ignore unreachable server', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);
  });

  it('should not raise any errors', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);
    expect(loggerMock.logError).not.toHaveBeenCalled();
  });
});
