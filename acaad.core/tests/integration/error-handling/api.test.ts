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
  ResponseStatusCodeError,
  ComponentType
} from '@acaad/abstractions';
import { Cause, Option } from 'effect';
import { ChangeType } from '@acaad/abstractions/src';

describe('api error handling', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapter: Mock<IConnectedServiceAdapter>;
  let stateObserver: IStateObserver;
  let throwAwayInstance: ComponentManager | undefined;

  beforeAll(async () => {
    // const logger = new MockCsLogger();
    // intTestContext = await createIntegrationTestContext(3, undefined, logger);

    intTestContext = await createIntegrationTestContext(3);

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

    it('should handle unreachable server', async () => {
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
      expectOneError(ResponseSchemaError);
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
    const componentCheck = async (
      intTestContext: IAcaadIntegrationTestContext,
      simulateStatus: number,
      componentType: ComponentType,
      changeType: ChangeType,
      value?: unknown
    ) => {
      const rndServer = intTestContext.getRandomServer();
      await rndServer.apiServer.useCollectionAsync(`${simulateStatus}-status`);
      const rndComponent = rndServer.getRandomComponent(componentType);

      const result = await instance.handleOutboundStateChangeAsync(
        rndServer.getHost(),
        rndComponent,
        changeType,
        value !== undefined ? Option.some(value) : Option.none()
      );

      expect(result).toBe(false);
      expectOneError(ResponseStatusCodeError, (err: ResponseStatusCodeError) => {
        expect(err.expectedStatusCode).toBe(200);
        expect(err.actualStatusCode).toBe(simulateStatus);
      });
    };

    beforeEach(async () => {
      await intTestContext.resetApiCollectionAsync();
    });

    it('sanity check', async () => {
      const rndServer = intTestContext.getRandomServer();
      const rndComponent = rndServer.getRandomComponent(ComponentType.Button);

      const result = await instance.handleOutboundStateChangeAsync(
        rndServer.getHost(),
        rndComponent,
        'action',
        Option.none<unknown>()
      );

      expect(result).toBe(true);
    });

    it('should handle 4xx server response for sensor', async () => {
      await componentCheck(intTestContext, 400, ComponentType.Sensor, 'query');
    });

    it('should handle invalid authentication for sensor', async () => {
      await componentCheck(intTestContext, 403, ComponentType.Sensor, 'query');
    });

    it('should handle 5xx server response for sensor', async () => {
      await componentCheck(intTestContext, 500, ComponentType.Sensor, 'query');
    });

    it('should handle 4xx server response for button', async () => {
      await componentCheck(intTestContext, 400, ComponentType.Button, 'action');
    });

    it('should handle invalid authentication for button', async () => {
      await componentCheck(intTestContext, 403, ComponentType.Button, 'action');
    });

    it('should handle 5xx server response for button', async () => {
      await componentCheck(intTestContext, 500, ComponentType.Button, 'action');
    });

    it('should handle 4xx server response for switch (query)', async () => {
      await componentCheck(intTestContext, 400, ComponentType.Switch, 'query');
    });

    it('should handle invalid authentication for switch (query)', async () => {
      await componentCheck(intTestContext, 403, ComponentType.Switch, 'query');
    });

    it('should handle 5xx server response for switch (query)', async () => {
      await componentCheck(intTestContext, 500, ComponentType.Switch, 'query');
    });

    it('should handle 4xx server response for switch (action, val=true)', async () => {
      await componentCheck(intTestContext, 400, ComponentType.Switch, 'action', true);
    });

    it('should handle invalid authentication for switch (action, val=true)', async () => {
      await componentCheck(intTestContext, 403, ComponentType.Switch, 'action', true);
    });

    it('should handle 5xx server response for switch (action, val=true)', async () => {
      await componentCheck(intTestContext, 500, ComponentType.Switch, 'action', true);
    });

    it('should handle 4xx server response for switch (action, val=false)', async () => {
      await componentCheck(intTestContext, 400, ComponentType.Switch, 'action', false);
    });

    it('should handle invalid authentication for switch (action, val=false)', async () => {
      await componentCheck(intTestContext, 403, ComponentType.Switch, 'action', false);
    });

    it('should handle 5xx server response for switch (action, val=false)', async () => {
      await componentCheck(intTestContext, 500, ComponentType.Switch, 'action', false);
    });
  });
});
