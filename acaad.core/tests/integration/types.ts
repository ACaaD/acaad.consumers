import {
  AcaadHost,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  ICsLogger,
  AcaadEvent
} from '@acaad/abstractions';

import { ComponentManager } from '../../src';

import { Mock } from 'ts-jest-mocker';
import { DependencyContainer } from 'tsyringe';
import { ServerMocks } from '@acaad/testing';
import {} from '@acaad/abstractions';

export interface IStateObserver {
  waitForSpanAsync(spanName: string, timeoutMs?: number): Promise<void>;

  waitForSignalRClient(): Promise<void>;
}

export interface IAcaadIntegrationTestContext {
  serverMocks: ServerMocks[];
  getRandomServer(): ServerMocks;

  fwkContainer: DependencyContainer;
  instance: ComponentManager;

  logger: ICsLogger;

  serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  serviceContextMock: Mock<IConnectedServiceContext>;

  stateObserver: IStateObserver;

  getHosts(): AcaadHost[];
  getLoggerMock(): Mock<ICsLogger>;

  startMockServersAsync(): Promise<void>;
  startAllAsync(): Promise<void>;
  disposeAsync(): Promise<void>;

  queueEventAndWaitAsync(
    serverMock: ServerMocks,
    event: AcaadEvent,
    spanName: string,
    timeoutMs?: number
  ): Promise<void>;

  startAndWaitForSignalR(): Promise<void>;

  getThrowAwayInstance(): ComponentManager;
}
