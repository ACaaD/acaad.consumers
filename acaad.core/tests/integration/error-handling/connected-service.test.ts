import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { createIntegrationTestContext } from '../framework/test-setup';

import {
  IConnectedServiceAdapter,
  ComponentType,
  ConnectedServiceFunction,
  AcaadError,
  AcaadEvent
} from '@acaad/abstractions';

import { sanityCheckGenerator } from '../shared-flows';
import { Mock } from 'ts-jest-mocker';
import { beforeEach } from 'node:test';
import { TestEventFactory } from '../factories/test-event-factory';
import { ServerMocks } from '@acaad/testing';
import { setupConnectedServiceMock } from '../mocks/MockServiceAdapter';

describe('connected service error handling', () => {
  let intTestContext: IAcaadIntegrationTestContext;
  let instance: ComponentManager;
  let serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  let stateObserver: IStateObserver;

  let throwAwayInstance: ComponentManager | undefined;

  const recoverableError = new Error('recoverable-error');
  const fatalError = new Error('fatal-error');

  const mappedAcaadError = new AcaadError('', '');

  beforeAll(async () => {
    intTestContext = await createIntegrationTestContext();

    serviceAdapterMock = intTestContext.serviceAdapterMock;
    instance = intTestContext.instance;
    stateObserver = intTestContext.stateObserver;

    await intTestContext.startMockServersAsync();
  });

  beforeEach(async () => {
    serviceAdapterMock.mapServiceError = jest.fn();
    serviceAdapterMock.mapServiceError.mockReturnValue(mappedAcaadError);
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

  it('sanity check', async () => {
    throwAwayInstance = intTestContext.getThrowAwayInstance();
    await sanityCheckGenerator(intTestContext, throwAwayInstance)();
  });

  describe('createServerModelAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'createServerModelAsync';

    beforeAll(() => {
      setupConnectedServiceMock(intTestContext);
      serviceAdapterMock.mapServiceError.mockReturnValue(mappedAcaadError);
    });

    it('should pass occurred error to mapper', async () => {
      serviceAdapterMock.createServerModelAsync.mockRejectedValue(recoverableError);

      await instance.createMissingComponentsAsync();
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      serviceAdapterMock.createServerModelAsync.mockRejectedValue(recoverableError);

      await instance.createMissingComponentsAsync();
      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(mappedAcaadError, expect.anything());
    });
  });

  describe('createComponentModelAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'createComponentModelAsync';

    beforeAll(() => {
      setupConnectedServiceMock(intTestContext);
      serviceAdapterMock.mapServiceError.mockReturnValue(mappedAcaadError);
    });

    it('should pass occurred error to mapper', async () => {
      serviceAdapterMock.createComponentModelAsync.mockRejectedValue(recoverableError);

      const result = await instance.createMissingComponentsAsync();

      expect(result).toBe(false);
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalled();
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      serviceAdapterMock.createComponentModelAsync.mockRejectedValue(recoverableError);

      await instance.createMissingComponentsAsync();

      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(mappedAcaadError, expect.anything());
    });
  });

  describe('registerStateChangeCallbackAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'registerStateChangeCallbackAsync';

    beforeAll(() => {
      setupConnectedServiceMock(intTestContext);
      serviceAdapterMock.mapServiceError.mockReturnValue(mappedAcaadError);
    });

    it('should pass occurred error to mapper', async () => {
      serviceAdapterMock.registerStateChangeCallbackAsync.mockRejectedValue(recoverableError);

      throwAwayInstance = intTestContext.getThrowAwayInstance();
      const start = await throwAwayInstance.startAsync();

      expect(start).toBe(false);
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      serviceAdapterMock.registerStateChangeCallbackAsync.mockRejectedValue(recoverableError);

      throwAwayInstance = intTestContext.getThrowAwayInstance();
      const start = await throwAwayInstance.startAsync();

      expect(start).toBe(false);
      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(mappedAcaadError, expect.anything());
    });
  });

  describe('updateComponentStateAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'updateComponentStateAsync';

    beforeAll(async () => {
      setupConnectedServiceMock(intTestContext);
      serviceAdapterMock.mapServiceError.mockReturnValue(mappedAcaadError);

      await intTestContext.startAndWaitForSignalR();
    });

    function getEventData(): [ServerMocks, AcaadEvent] {
      const rndServer = intTestContext.getRandomServer();
      const rndComponent = rndServer.getRandomComponent(ComponentType.Sensor);
      const eventToRaise = TestEventFactory.createComponentOutcomeEvent(rndComponent.toIdentifier());
      return [rndServer, eventToRaise];
    }

    it('sanity check', async () => {
      serviceAdapterMock.updateComponentStateAsync.mockResolvedValue();

      const [srv, event] = getEventData();
      await intTestContext.queueEventAndWaitAsync(srv, event, 'acaad:cs:updateComponentState');

      expect(serviceAdapterMock.mapServiceError).not.toHaveBeenCalled();
    });

    it('should pass occurred error to mapper', async () => {
      serviceAdapterMock.updateComponentStateAsync.mockRejectedValue(recoverableError);

      const [srv, event] = getEventData();
      await intTestContext.queueEventAndWaitAsync(srv, event, 'acaad:cs:updateComponentState');

      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      serviceAdapterMock.updateComponentStateAsync.mockRejectedValue(recoverableError);

      const [srv, event] = getEventData();
      await intTestContext.queueEventAndWaitAsync(srv, event, 'acaad:cs:updateComponentState');

      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(mappedAcaadError, expect.anything());
    });
  });

  /*  
      TODO: Tests to shut down manager instance if returned error (mapServiceError) 
      returns AcaadFatalError or any child class. 
  */
});
