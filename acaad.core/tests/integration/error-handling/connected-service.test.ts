import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { ComponentManager } from '../../../src';
import { createIntegrationTestContext } from '../framework/test-setup';

import {
  IConnectedServiceAdapter,
  ComponentType,
  ConnectedServiceFunction,
  AcaadError,
  AcaadEvent,
  ComponentDescriptor,
  EventFactory
} from '@acaad/abstractions';

import { sanityCheckGenerator } from '../shared-flows';
import { Mock } from 'ts-jest-mocker';
import { beforeEach } from 'node:test';
import { TestEventFactory } from '../factories/test-event-factory';
import { ServerMocks } from '@acaad/testing';
import { MockCsLogger } from '../mocks/MockCsLogger';

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
    // const logger = new MockCsLogger();
    // intTestContext = await createIntegrationTestContext(undefined, undefined, logger);

    intTestContext = await createIntegrationTestContext();

    serviceAdapterMock = intTestContext.serviceAdapterMock;
    instance = intTestContext.instance;
    stateObserver = intTestContext.stateObserver;

    await intTestContext.startMockServersAsync();
  });

  beforeEach(async () => {
    (serviceAdapterMock.mapServiceError as jest.Mock).mockReturnValue(mappedAcaadError);
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
    const failedFunction: ConnectedServiceFunction = 'createComponentModelAsync';

    beforeEach(() => {
      serviceAdapterMock.createServerModelAsync.mockRejectedValue(recoverableError);
    });

    it('should pass occurred error to mapper', async () => {
      await instance.createMissingComponentsAsync();
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      await instance.createMissingComponentsAsync();
      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(recoverableError);
    });
  });

  describe('createComponentModelAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'createComponentModelAsync';

    beforeEach(() => {
      serviceAdapterMock.createComponentModelAsync.mockRejectedValue(recoverableError);
    });

    it('should pass occurred error to mapper', async () => {
      await instance.createMissingComponentsAsync();
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      await instance.createMissingComponentsAsync();
      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(recoverableError);
    });
  });

  describe('registerStateChangeCallbackAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'registerStateChangeCallbackAsync';

    beforeEach(() => {
      serviceAdapterMock.registerStateChangeCallbackAsync.mockRejectedValue(recoverableError);
    });

    it('should pass occurred error to mapper', async () => {
      throwAwayInstance = intTestContext.getThrowAwayInstance();
      const start = await throwAwayInstance.startAsync();

      expect(start).toBe(true);
      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      throwAwayInstance = intTestContext.getThrowAwayInstance();
      const start = await throwAwayInstance.startAsync();

      expect(start).toBe(true);
      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(recoverableError);
    });
  });

  describe('updateComponentStateAsync', () => {
    const failedFunction: ConnectedServiceFunction = 'updateComponentStateAsync';

    beforeAll(async () => {
      await intTestContext.startAndWaitForSignalR();
    });

    beforeEach(async () => {
      serviceAdapterMock.updateComponentStateAsync.mockRejectedValue(recoverableError);
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
      const [srv, event] = getEventData();
      await intTestContext.queueEventAndWaitAsync(srv, event, 'acaad:cs:updateComponentState');

      expect(serviceAdapterMock.mapServiceError).toHaveBeenCalledWith(failedFunction, recoverableError);
    });

    it('should pass mapped acaad error to error event listener', async () => {
      const [srv, event] = getEventData();
      await intTestContext.queueEventAndWaitAsync(srv, event, 'acaad:cs:updateComponentState');

      expect(serviceAdapterMock.onErrorAsync).toHaveBeenCalledWith(recoverableError);
    });
  });
});
