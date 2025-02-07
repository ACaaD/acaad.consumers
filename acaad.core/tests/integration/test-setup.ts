import { mock, Mock } from 'ts-jest-mocker';
import {
  AcaadAuthentication,
  AcaadHost,
  ComponentDescriptor,
  ComponentManager,
  FrameworkContainer,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  ICsLogger
} from '../../src';
import { DependencyContainer } from 'tsyringe';
import { IAcaadApiServer, IAcaadSignalRServer, AcaadApiServer, AcaadSignalRServer } from '@acaad/testing';
import { Cause } from 'effect';
import { IAcaadIntegrationTestContext } from './types';

class MockCsLogger implements ICsLogger {
  logTrace(...data: any[]): void {
    this.log('trace', ...data);
  }
  logDebug(...data: any[]): void {
    this.log('debug', ...data);
  }
  logInformation(...data: any[]): void {
    this.log('info', ...data);
  }
  logWarning(...data: any[]): void {
    this.log('warn', ...data);
  }
  logError(cause?: Cause.Cause<unknown>, error?: Error, ...data: any[]): void {
    if (cause) {
      console.error(Cause.pretty(cause), cause.toJSON(), ...data);
      return;
    }

    if (error) {
      console.error(error, ...data);
      return;
    }

    console.error(...data);
  }

  private log(level: string, ...data: any[]): void {
    console.log(`[${level.padStart(5, ' ')}][${Date.now()}]`, ...data);
  }
}

function setupConnectedServiceMock(intTestContext: IAcaadIntegrationTestContext) {
  const { serviceAdapterMock, apiMock, signalrMock } = intTestContext;

  const authentication: AcaadAuthentication | undefined = undefined;

  serviceAdapterMock.getConnectedServersAsync.mockResolvedValue([
    new AcaadHost('mock-server', 'localhost', apiMock.port, authentication, signalrMock.port)
  ]);

  serviceAdapterMock.registerStateChangeCallbackAsync.mockResolvedValue();

  serviceAdapterMock.getAllowedConcurrency.mockReturnValue(1);
  serviceAdapterMock.createServerModelAsync.mockResolvedValue();
  serviceAdapterMock.createComponentModelAsync.mockResolvedValue();
  serviceAdapterMock.onServerConnectedAsync.mockResolvedValue();
  serviceAdapterMock.onServerDisconnectedAsync.mockResolvedValue();
  serviceAdapterMock.updateComponentStateAsync.mockResolvedValue();
  serviceAdapterMock.getComponentDescriptorByComponent.mockImplementation(
    (c) => new ComponentDescriptor(c.name)
  );
}

export async function createIntegrationTestContext() {
  const serviceAdapterMock: Mock<IConnectedServiceAdapter> = mock<IConnectedServiceAdapter>();
  const serviceContextMock: Mock<IConnectedServiceContext> = mock<IConnectedServiceContext>();

  const loggerMock: Mock<ICsLogger> = mock(MockCsLogger);
  serviceContextMock.logger = loggerMock;

  const acaadApiServer: IAcaadApiServer = await AcaadApiServer.createMockServerAsync();
  const acaadSignalRServer: IAcaadSignalRServer = await AcaadSignalRServer.createMockServerAsync();

  const fwkContainer: DependencyContainer = FrameworkContainer.CreateCsContainer<IConnectedServiceAdapter>(
    undefined,
    {
      useValue: serviceAdapterMock
    }
  )
    .WithContext<IConnectedServiceContext>('mock-context', serviceContextMock)
    .Build();

  const instance: ComponentManager = fwkContainer.resolve(ComponentManager) as ComponentManager;

  const intTestContext: IAcaadIntegrationTestContext = {
    instance,
    fwkContainer,
    apiMock: acaadApiServer,
    signalrMock: acaadSignalRServer,
    serviceContextMock: serviceContextMock,
    serviceAdapterMock: serviceAdapterMock,
    loggerMock: loggerMock,
    async disposeAsync(): Promise<void> {
      await this.instance.shutdownAsync();
      await this.fwkContainer.dispose();

      await Promise.all([this.apiMock.disposeAsync(), this.signalrMock.disposeAsync()]);
    },
    async startMockServersAsync(): Promise<void> {
      await Promise.all([this.apiMock.startAsync(), this.signalrMock.startAsync()]);
    },
    async startAllAsync(): Promise<void> {
      await this.startMockServersAsync();
      await this.instance.startAsync();
    }
  };

  setupConnectedServiceMock(intTestContext);

  return intTestContext;
}
