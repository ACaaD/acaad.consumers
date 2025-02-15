import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { MockCsLogger } from '../mocks/MockCsLogger';
import { createIntegrationTestContext } from '../framework/test-setup';
import { Mock } from 'ts-jest-mocker';
import {
  IConnectedServiceAdapter,
  AcaadError,
  AcaadFatalError,
  ResponseSchemaError,
  AcaadServerUnreachableError,
  CalloutError,
  ResponseStatusCodeError
} from '@acaad/abstractions';

describe('api error handling', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapter: Mock<IConnectedServiceAdapter>;
  let stateObserver: IStateObserver;
  let throwAwayInstance: ComponentManager | undefined;

  beforeAll(async () => {
    const logger = new MockCsLogger();
    intTestContext = await createIntegrationTestContext(3, undefined, logger);
    instance = intTestContext.instance;
    serviceAdapter = intTestContext.serviceAdapterMock;
    stateObserver = intTestContext.stateObserver;

    await intTestContext.startAllAsync();
  });

  afterAll(async () => {
    await intTestContext.disposeAsync();
  });

  afterEach(async () => {
    if (throwAwayInstance) {
      await throwAwayInstance.shutdownAsync();
      // eslint-disable-next-line require-atomic-updates
      throwAwayInstance = undefined;
    }
  });

  const expectOneError = <T>(classType: any, errCheck?: (err: T) => void) => {
    expect(serviceAdapter.onErrorAsync).toHaveBeenCalledTimes(1);
    expect(serviceAdapter.onErrorAsync).toHaveBeenCalledWith(expect.any(classType), expect.anything());

    const raisedError = (serviceAdapter.onErrorAsync as any).mock.calls[0][0];
    errCheck?.call(this, raisedError);
  };

  describe('server metadata query', () => {
    beforeEach(async () => {
      await intTestContext.resetApiCollectionAsync();
      await intTestContext.resumeAllAsync();
    });

    it.only('should handle unreachable server', async () => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.pauseAsync();

      const res = await instance.createMissingComponentsAsync();

      expect(res).toBe(true);
      expectOneError(AcaadServerUnreachableError, (err: AcaadServerUnreachableError) =>
        expect(err.host.friendlyName).toBe(rndServer.getHost().friendlyName)
      );
    });

    it('should handle invalid openapi response schema', async () => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.useCollectionAsync('missing-acaad-metadata');

      const res = await instance.createMissingComponentsAsync();
      expect(res).toBe(true);
      expectOneError(ResponseSchemaError);
    });

    it('should handle empty server response', async () => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.useCollectionAsync('empty-response');

      const res = await instance.createMissingComponentsAsync();

      expect(res).toBe(true);
      expectOneError(CalloutError);
    });

    it('should handle 4xx server response', async () => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.useCollectionAsync('400-status');

      const res = await instance.createMissingComponentsAsync();

      expect(res).toBe(true);
      expectOneError(ResponseStatusCodeError, (err: ResponseStatusCodeError) => {
        expect(err.expectedStatusCode).toBe(200);
        expect(err.actualStatusCode).toBe(400);
      });
    });

    it('should handle 5xx server response', async () => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.useCollectionAsync('500-status');

      const res = await instance.createMissingComponentsAsync();

      expect(res).toBe(true);
      expectOneError(ResponseStatusCodeError, (err: ResponseStatusCodeError) => {
        expect(err.expectedStatusCode).toBe(200);
        expect(err.actualStatusCode).toBe(500);
      });
    });

    it('should handle invalid authentication', async () => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.useCollectionAsync('403-status');

      const res = await instance.createMissingComponentsAsync();

      expect(res).toBe(true);
      expectOneError(ResponseStatusCodeError, (err: ResponseStatusCodeError) => {
        expect(err.expectedStatusCode).toBe(200);
        expect(err.actualStatusCode).toBe(403);
      });
    });
  });

  describe('outbound events', () => {
    it('should handle 4xx server response', async () => {});

    it('should handle 5xx server response', async () => {});

    it('should handle invalid authentication', async () => {
      // TODO
    });
  });

  describe('signalr', () => {
    it('should handle unreachable server', async () => {});

    it('should handle server error on connect', async () => {
      // TODO: TBD how to force an error from the mock?
    });

    it('should handle server error on disconnect', async () => {
      // TODO: TBD how to force an error from the mock?
    });
  });
});
