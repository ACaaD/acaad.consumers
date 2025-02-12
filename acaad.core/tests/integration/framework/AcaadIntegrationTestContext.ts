import { DependencyContainer } from 'tsyringe';
import { ComponentManager } from '../../../src';
import { Mock } from 'ts-jest-mocker';
import { getTestLogger } from './test-setup';
import { IAcaadIntegrationTestContext, IStateObserver } from '../types';
import { LogFunc, ServerMocks, getRandomInt } from '@acaad/testing';
import {
  ICsLogger,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  AcaadHost
} from '@acaad/abstractions';

export class AcaadIntegrationTestContext implements IAcaadIntegrationTestContext {
  private readonly log: LogFunc;

  public serverMocks: ServerMocks[];
  public fwkContainer: DependencyContainer;
  public instance: ComponentManager;
  public logger: ICsLogger;
  public serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  public serviceContextMock: Mock<IConnectedServiceContext>;

  public stateObserver: IStateObserver;

  public loggerMock: Mock<ICsLogger> | undefined;

  public constructor(
    serverMocks: ServerMocks[],
    fwkContainer: DependencyContainer,
    instance: ComponentManager,
    serviceAdapterMock: Mock<IConnectedServiceAdapter>,
    serviceContextMock: Mock<IConnectedServiceContext>,
    stateObserver: IStateObserver,
    loggerMock?: Mock<ICsLogger>
  ) {
    this.log = getTestLogger('INT-CTX');

    this.serverMocks = serverMocks;
    this.fwkContainer = fwkContainer;
    this.instance = instance;
    this.logger = serviceContextMock.logger;
    this.serviceAdapterMock = serviceAdapterMock;
    this.serviceContextMock = serviceContextMock;
    this.stateObserver = stateObserver;

    this.loggerMock = loggerMock;
  }

  getHosts(): AcaadHost[] {
    return this.serverMocks.map((sm) => sm.getHost());
  }

  getLoggerMock(): Mock<ICsLogger> {
    if (this.loggerMock === undefined) {
      throw new Error(
        'Logger mock was requested but it is undefined. This strongly indicates invalid test setup.'
      );
    }

    return this.loggerMock;
  }

  getRandomServer(): ServerMocks {
    return this.serverMocks[getRandomInt(this.serverMocks.length - 1)];
  }

  public async disposeAsync(): Promise<void> {
    this.log(`Shutting down instance.`);
    await this.instance.shutdownAsync();
    this.log(`Disposing framework container.`);
    await this.fwkContainer.dispose();
    this.log(`Dispose done`);

    await Promise.all([...this.serverMocks.map((sm) => sm.disposeAsync())]);
    this.log(`${this.serverMocks.length} (*2) servers stopped`);
  }

  public async startMockServersAsync(): Promise<void> {
    await Promise.all([...this.serverMocks.map((sm) => sm.startAsync())]);
  }

  public async startAllAsync(): Promise<void> {
    await this.startMockServersAsync();
    await this.instance.startAsync();
  }
}
