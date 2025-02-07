import { ComponentManager, IConnectedServiceAdapter, IConnectedServiceContext, ICsLogger } from '../../src';
import { IAcaadApiServer, IAcaadSignalRServer } from '@acaad/testing';
import { Mock } from 'ts-jest-mocker';
import { DependencyContainer } from 'tsyringe';

export interface IAcaadIntegrationTestContext {
  apiMock: IAcaadApiServer;
  signalrMock: IAcaadSignalRServer;

  fwkContainer: DependencyContainer;
  instance: ComponentManager;

  loggerMock: Mock<ICsLogger>;
  serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  serviceContextMock: Mock<IConnectedServiceContext>;

  startMockServersAsync(): Promise<void>;
  startAllAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
}
