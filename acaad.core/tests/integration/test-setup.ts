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

export async function createPerformanceTestContext(serverCount: number, componentCountPerServer: number) {}

export async function createIntegrationTestContext() {
  const serviceAdapterMock: Mock<IConnectedServiceAdapter> = mock<IConnectedServiceAdapter>();
  const serviceContextMock: Mock<IConnectedServiceContext> = mock<IConnectedServiceContext>();

  const loggerMock: Mock<ICsLogger> = mock(MockCsLogger);
  serviceContextMock.logger = new MockCsLogger();

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

  const intTestContext: IAcaadIntegrationTestContext = new AcaadIntegrationTestContext(
    [acaadApiServer],
    [acaadSignalRServer],
    fwkContainer,
    instance,
    loggerMock,
    serviceAdapterMock,
    serviceContextMock
  );

  setupConnectedServiceMock(intTestContext);

  return intTestContext;
}
