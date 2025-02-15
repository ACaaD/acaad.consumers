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
import { ServerMocks, TrackedRequest } from '@acaad/testing';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';

export interface IStateObserver {
  waitForSpanAsync(spanName: string, timeoutMs?: number): Promise<ReadableSpan>;

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

  enableRequestTracking(): void;
  clearTrackedRequests(): void;
  getTrackedRequests(traceId?: string, spanId?: string): TrackedRequest[];

  resetApiCollectionAsync(): Promise<void>;
  resumeAllAsync(): Promise<void>;
}
