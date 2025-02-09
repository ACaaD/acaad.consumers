import {
  AcaadHost,
  ComponentManager,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  ICsLogger
} from '../../src';
import { IAcaadApiServer, IAcaadSignalRServer } from '@acaad/testing';
import { Mock } from 'ts-jest-mocker';
import { DependencyContainer } from 'tsyringe';

export interface IAcaadIntegrationTestContext {
  apiMocks: IAcaadApiServer[];
  signalrMocks: IAcaadSignalRServer[];

  fwkContainer: DependencyContainer;
  instance: ComponentManager;

  loggerMock: Mock<ICsLogger>;
  serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  serviceContextMock: Mock<IConnectedServiceContext>;

  getHosts(): AcaadHost[];

  startMockServersAsync(): Promise<void>;
  startAllAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
}

export class AcaadIntegrationTestContext implements IAcaadIntegrationTestContext {
  public apiMocks: IAcaadApiServer[];
  public signalrMocks: IAcaadSignalRServer[];
  public fwkContainer: DependencyContainer;
  public instance: ComponentManager;
  public loggerMock: Mock<ICsLogger>;
  public serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  public serviceContextMock: Mock<IConnectedServiceContext>;

  public constructor(
    apiMocks: IAcaadApiServer[],
    signalrMocks: IAcaadSignalRServer[],
    fwkContainer: DependencyContainer,
    instance: ComponentManager,
    loggerMock: Mock<ICsLogger>,
    serviceAdapterMock: Mock<IConnectedServiceAdapter>,
    serviceContextMock: Mock<IConnectedServiceContext>
  ) {
    this.apiMocks = apiMocks;
    this.signalrMocks = signalrMocks;
    this.fwkContainer = fwkContainer;
    this.instance = instance;
    this.loggerMock = loggerMock;
    this.serviceAdapterMock = serviceAdapterMock;
    this.serviceContextMock = serviceContextMock;
  }

  getHosts(): AcaadHost[] {
    return this.apiMocks.map(
      (am, idx) =>
        new AcaadHost(`mock-server-${idx}`, `localhost`, am.port, undefined, this.signalrMocks[idx].port)
    );
  }

  public async disposeAsync(): Promise<void> {
    console.log(`[T-FWK][${new Date().toISOString()}] shutting down instance.`);
    await this.instance.shutdownAsync();
    console.log(`[T-FWK][${new Date().toISOString()}] disposing framework container.`);
    await this.fwkContainer.dispose();
    console.log(`[T-FWK][${new Date().toISOString()}] dispose done`);

    await Promise.all([
      ...this.apiMocks.map((am) => am.disposeAsync()),
      ...this.signalrMocks.map((sm) => sm.disposeAsync())
    ]);
    console.log(
      `[T-FWK][${new Date().toISOString()}] ${this.apiMocks.length + this.signalrMocks.length} servers stopped`
    );
  }

  public async startMockServersAsync(): Promise<void> {
    await Promise.all([
      ...this.apiMocks.map((am) => am.startAsync()),
      ...this.signalrMocks.map((sm) => sm.startAsync())
    ]);
  }

  public async startAllAsync(): Promise<void> {
    await this.startMockServersAsync();
    await this.instance.startAsync();
  }
}
