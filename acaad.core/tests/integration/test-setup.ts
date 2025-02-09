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
import { AcaadIntegrationTestContext, IAcaadIntegrationTestContext } from './types';
import { int } from 'effect/Schema';

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
    console.log(`[${level.padStart(5, ' ')}][${new Date().toISOString()}]`, ...data);
  }
}

function setupConnectedServiceMock(intTestContext: IAcaadIntegrationTestContext) {
  const { serviceAdapterMock } = intTestContext;

  const authentication: AcaadAuthentication | undefined = undefined;

  serviceAdapterMock.getConnectedServersAsync.mockResolvedValue(intTestContext.getHosts());

  serviceAdapterMock.registerStateChangeCallbackAsync.mockResolvedValue();

  serviceAdapterMock.getAllowedConcurrency.mockReturnValue(16);
  serviceAdapterMock.createServerModelAsync.mockResolvedValue();
  serviceAdapterMock.createComponentModelAsync.mockResolvedValue();
  serviceAdapterMock.onServerConnectedAsync.mockResolvedValue();
  serviceAdapterMock.onServerDisconnectedAsync.mockResolvedValue();
  serviceAdapterMock.updateComponentStateAsync.mockResolvedValue();
  serviceAdapterMock.getComponentDescriptorByComponent.mockImplementation(
    (c) => new ComponentDescriptor(c.name)
  );
}

export async function createPerformanceTestContext(serverCount: number, componentCountPerServer: number) {
  const enumerable = Array.from({ length: serverCount });

  const serviceAdapterMock: Mock<IConnectedServiceAdapter> = mock<IConnectedServiceAdapter>();
  const serviceContextMock: Mock<IConnectedServiceContext> = mock<IConnectedServiceContext>();

  const loggerMock: Mock<ICsLogger> = mock(MockCsLogger);
  serviceContextMock.logger = new MockCsLogger();

  const apiServerPromise = Promise.all(
    enumerable.map((_) => AcaadApiServer.createMockServerAsync(undefined, componentCountPerServer))
  );
  const signalrServerPromise = Promise.all(enumerable.map((_) => AcaadSignalRServer.createMockServerAsync()));

  const [apiServers, signalrServers] = await Promise.all([apiServerPromise, signalrServerPromise]);

  const fwkContainer: DependencyContainer = FrameworkContainer.CreateCsContainer<IConnectedServiceAdapter>(
    undefined,
    {
      useValue: serviceAdapterMock
    }
  )
    .WithContext<IConnectedServiceContext>('mock-context', serviceContextMock)
    .Build();

  const instance: ComponentManager = fwkContainer.resolve(ComponentManager) as ComponentManager;

  const intTestContext: IAcaadIntegrationTestContext = new AcaadIntegrationTestContext(
    apiServers,
    signalrServers,
    fwkContainer,
    instance,
    loggerMock,
    serviceAdapterMock,
    serviceContextMock
  );

  setupConnectedServiceMock(intTestContext);

  return intTestContext;
}

export async function createIntegrationTestContext() {
  return await createPerformanceTestContext(1, 1);
}
