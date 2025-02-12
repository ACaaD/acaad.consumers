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
  AcaadHost,
  AcaadEvent
} from '@acaad/abstractions';

export class AcaadIntegrationTestContext implements IAcaadIntegrationTestContext {
  private readonly log: LogFunc;
  private readonly throwAwayInstances: ComponentManager[] = [];

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

  async startAndWaitForSignalR(): Promise<void> {
    console.log(this.instance.getState());
    const checkpoint = this.stateObserver.waitForSignalRClient();
    const start = await this.instance.startAsync();
    console.log('Start+Wait', start);
    expect(start).toBe(true);
    console.log(this.instance.getState());
    await checkpoint;
    console.log(this.instance.getState());
    await this.instance.createMissingComponentsAsync();
  }

  getThrowAwayInstance(): ComponentManager {
    const instance: ComponentManager = this.fwkContainer.resolve(ComponentManager) as ComponentManager;
    this.throwAwayInstances.push(instance);
    return instance;
  }

  async queueEventAndWaitAsync(
    serverMock: ServerMocks,
    event: AcaadEvent,
    spanName: string,
    timeoutMs: number = 200
  ): Promise<void> {
    const checkpoint = this.stateObserver.waitForSpanAsync(spanName, timeoutMs);
    await serverMock.signalrServer.pushEvent(event);
    await checkpoint;
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
    const runningThrowAwayInstances = this.throwAwayInstances.filter((i) => i.getState() !== 'Stopped');
    if (runningThrowAwayInstances.length > 0) {
      await Promise.all(this.throwAwayInstances.map((i) => i.shutdownAsync()));
    }

    this.log(`Shutting down instance.`);
    await this.instance.shutdownAsync();
    this.log(`Disposing framework container.`);
    await this.fwkContainer.dispose();
    this.log(`Dispose done`);

    await Promise.all([...this.serverMocks.map((sm) => sm.disposeAsync())]);
    this.log(`${this.serverMocks.length} (*2) servers stopped`);

    if (runningThrowAwayInstances.length > 0) {
      throw new Error(
        'At least one throw-away instance was not shutdown. To save resources please ensure to stop them as soon as the test is done. Fix the test.'
      );
    }
  }

  public async startMockServersAsync(): Promise<void> {
    await Promise.all([...this.serverMocks.map((sm) => sm.startAsync())]);
  }

  public async startAllAsync(): Promise<void> {
    await this.startMockServersAsync();
    const start = await this.instance.startAsync();

    expect(start).toBe(true);
  }
}
