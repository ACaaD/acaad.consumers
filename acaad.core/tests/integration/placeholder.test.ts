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
import { IAcaadApiServer, AcaadApiServer } from '@acaad/testing';

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
    console.log(`[${level}]`, ...data);
  }
}

describe('integration tests', () => {
  let serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  let serviceContextMock: Mock<IConnectedServiceContext>;
  let loggerMock: Mock<ICsLogger>;

  let acaadServer: IAcaadApiServer;

  let fwkContainer: DependencyContainer;

  let instance: ComponentManager;

  beforeAll(async () => {
    serviceAdapterMock = mock<IConnectedServiceAdapter>();
    serviceContextMock = mock<IConnectedServiceContext>();
    loggerMock = mock(MockCsLogger);
    serviceContextMock.logger = new MockCsLogger();

    acaadServer = await AcaadApiServer.createMockServerAsync();
    await acaadServer.startAsync();

    serviceAdapterMock.getConnectedServersAsync.mockResolvedValue([
      new AcaadHost('mock-server', 'localhost', acaadServer.port, undefined, 1337)
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
    await fwkContainer.dispose();
  });

  it('should start', () => {
    console.log('Testing something.');
  });

  it('should sync components', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);

    expect(serviceAdapterMock.createServerModelAsync).toHaveBeenCalledTimes(2);
    expect(serviceAdapterMock.createComponentModelAsync).toHaveBeenCalledTimes(1);
  });

  it('should ignore unreachable server', async () => {
    const result = await instance.createMissingComponentsAsync();
    expect(result).toBe(true);
  });
});
