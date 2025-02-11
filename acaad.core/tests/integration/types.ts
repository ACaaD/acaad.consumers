import {
  AcaadHost,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  ICsLogger
} from '@acaad/abstractions';

import { ComponentManager } from '../../src';

import { Mock } from 'ts-jest-mocker';
import { DependencyContainer } from 'tsyringe';
import { ServerMocks } from '@acaad/testing';
import { ComponentDescriptor, ComponentType } from '@acaad/abstractions/src';

export interface IStateObserver {
  waitForSpanAsync(spanName: string, timeoutMs?: number): Promise<void>;

  waitForSignalRClient(): Promise<void>;
}

export interface IAcaadIntegrationTestContext {
  serverMocks: ServerMocks[];

  fwkContainer: DependencyContainer;
  instance: ComponentManager;

  loggerMock: Mock<ICsLogger>;
  serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  serviceContextMock: Mock<IConnectedServiceContext>;

  stateObserver: IStateObserver;

  getHosts(): AcaadHost[];

  startMockServersAsync(): Promise<void>;
  startAllAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
}

export class AcaadIntegrationTestContext implements IAcaadIntegrationTestContext {
  public serverMocks: ServerMocks[];
  public fwkContainer: DependencyContainer;
  public instance: ComponentManager;
  public loggerMock: Mock<ICsLogger>;
  public serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  public serviceContextMock: Mock<IConnectedServiceContext>;

  public stateObserver: IStateObserver;

  public constructor(
    serverMocks: ServerMocks[],
    fwkContainer: DependencyContainer,
    instance: ComponentManager,
    loggerMock: Mock<ICsLogger>,
    serviceAdapterMock: Mock<IConnectedServiceAdapter>,
    serviceContextMock: Mock<IConnectedServiceContext>,
    stateObserver: IStateObserver
  ) {
    this.serverMocks = serverMocks;
    this.fwkContainer = fwkContainer;
    this.instance = instance;
    this.loggerMock = loggerMock;
    this.serviceAdapterMock = serviceAdapterMock;
    this.serviceContextMock = serviceContextMock;
    this.stateObserver = stateObserver;
  }

  getHosts(): AcaadHost[] {
    return this.serverMocks.map((sm) => sm.getHost());
  }

  public async disposeAsync(): Promise<void> {
    console.log(`[T-FWK][${new Date().toISOString()}] shutting down instance.`);
    await this.instance.shutdownAsync();
    console.log(`[T-FWK][${new Date().toISOString()}] disposing framework container.`);
    await this.fwkContainer.dispose();
    console.log(`[T-FWK][${new Date().toISOString()}] dispose done`);

    await Promise.all([...this.serverMocks.map((sm) => sm.disposeAsync())]);
    console.log(`[T-FWK][${new Date().toISOString()}] ${this.serverMocks.length} (*2) servers stopped`);
  }

  public async startMockServersAsync(): Promise<void> {
    await Promise.all([...this.serverMocks.map((sm) => sm.startAsync())]);
  }

  public async startAllAsync(): Promise<void> {
    await this.startMockServersAsync();
    await this.instance.startAsync();
  }
}
