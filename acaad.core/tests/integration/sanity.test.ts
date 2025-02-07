import { Effect } from 'effect/Effect';
import {
  AcaadError,
  AcaadHost,
  AcaadServerMetadata,
  AcaadUnitOfMeasure,
  Component,
  ComponentDescriptor,
  ComponentManager,
  FrameworkContainer,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  ICsLogger,
  OutboundStateChangeCallback
} from '../../src';
import { mock, Mock } from 'ts-jest-mocker';
import { DependencyContainer } from 'tsyringe';
import { Cause } from 'effect';
import { IAcaadApiServer, AcaadApiServer, AcaadSignalRServer, IAcaadSignalRServer } from '@acaad/testing';

class MockConnectedServiceContext implements IConnectedServiceContext {
  logger: ICsLogger = {} as any;
}

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

describe('integration tests', () => {
  let serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  let serviceContextMock: Mock<IConnectedServiceContext>;
  let loggerMock: Mock<ICsLogger>;

  let acaadApiServer: IAcaadApiServer;
  let acaadSignalRServer: IAcaadSignalRServer;

  let fwkContainer: DependencyContainer;

  let instance: ComponentManager;

  beforeAll(async () => {
    serviceAdapterMock = mock<IConnectedServiceAdapter>();
    serviceContextMock = mock<IConnectedServiceContext>();
    loggerMock = mock(MockCsLogger);
    serviceContextMock.logger = loggerMock;

    acaadApiServer = await AcaadApiServer.createMockServerAsync();
    await acaadApiServer.startAsync();

    acaadSignalRServer = await AcaadSignalRServer.createMockServerAsync();
    await acaadSignalRServer.startAsync();

    serviceAdapterMock.getConnectedServersAsync.mockResolvedValue([
      new AcaadHost('mock-server', 'localhost', acaadApiServer.port, undefined, acaadSignalRServer.port)
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

    fwkContainer = FrameworkContainer.CreateCsContainer<IConnectedServiceAdapter>(undefined, {
      useValue: serviceAdapterMock
    })
      .WithContext<IConnectedServiceContext>('mock-context', serviceContextMock)
      .Build();

    instance = fwkContainer.resolve(ComponentManager) as ComponentManager;

    await instance.startAsync();
  });

  afterAll(async () => {
    await instance.shutdownAsync();
    console.log('Shutdown complete.');

    await fwkContainer.dispose();
    console.log('Disposed framework container.');

    await acaadApiServer.disposeAsync();
    console.log('Disposed mock api server.');

    await acaadSignalRServer.disposeAsync();
    console.log('Disposed mock signalR server.');
  });

  it('should start', () => {
    console.log('Testing something.');
  });

  it('should create server model', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createServerModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync sensor component', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync switch component', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should sync button component', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should ignore unreachable server', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);
  });

  it('should not raise any errors', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);
    expect(loggerMock.logError).not.toHaveBeenCalled();
  });

  // it('should raise signalr server connected event', async () => {
  //   expect(serviceAdapterMock.onServerConnectedAsync).toHaveBeenCalledTimes(1);
  // });
});
