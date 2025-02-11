import { mock, Mock } from 'ts-jest-mocker';
import {
  AcaadAuthentication,
  ComponentDescriptor,
  IConnectedServiceAdapter,
  IConnectedServiceContext,
  ICsLogger
} from '@acaad/abstractions';
import { ComponentManager, FrameworkContainer } from '../../src';
import { DependencyContainer } from 'tsyringe';
import { ServerMocks } from '@acaad/testing';
import { Cause } from 'effect';
import { AcaadIntegrationTestContext, IAcaadIntegrationTestContext, IStateObserver } from './types';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { IComponentConfiguration } from '@acaad/testing';

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

export async function createPerformanceTestContext(
  serverCount: number,
  componentConfiguration: IComponentConfiguration
) {
  const enumerable = Array.from({ length: serverCount });

  const serviceAdapterMock: Mock<IConnectedServiceAdapter> = mock<IConnectedServiceAdapter>();
  const serviceContextMock: Mock<IConnectedServiceContext> = mock<IConnectedServiceContext>();

  const loggerMock: Mock<ICsLogger> = mock(MockCsLogger);
  serviceContextMock.logger = new MockCsLogger();

  const serverMocks = await Promise.all(
    enumerable.map((_) => ServerMocks.createMockServersAsync(undefined, componentConfiguration))
  );

  const stateObserver = ObservableSpanExporter.Create();
  const fwkContainer: DependencyContainer = FrameworkContainer.CreateCsContainer<IConnectedServiceAdapter>(
    undefined,
    {
      useValue: serviceAdapterMock
    }
  )
    .WithContext<IConnectedServiceContext>('mock-context', serviceContextMock)
    .WithOpenTelemtry('single', (_) => stateObserver)
    .Build();

  const instance: ComponentManager = fwkContainer.resolve(ComponentManager) as ComponentManager;

  const intTestContext: IAcaadIntegrationTestContext = new AcaadIntegrationTestContext(
    serverMocks,
    fwkContainer,
    instance,
    loggerMock,
    serviceAdapterMock,
    serviceContextMock,
    stateObserver
  );

  setupConnectedServiceMock(intTestContext);

  return intTestContext;
}

class ObservableSpanExporter implements SpanExporter, IStateObserver {
  private static instance: ObservableSpanExporter = new ObservableSpanExporter();

  private trackedSpans: Map<string, () => void> = new Map<string, () => {}>();
  private trackedTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  private constructor() {
    console.log(`Creating new span exporter. Ref: ${ObservableSpanExporter.instance}`);
  }

  async waitForSignalRClient(): Promise<void> {
    const startMs = Date.now();
    await this.waitForSpanAsync('acaad:cs:onServerConnected');
    console.log(`[T-FWK] SignalR client connected after ${Date.now() - startMs}ms.`);
  }

  private static resolveWrapped(startMs: number, spanName: string, res: () => void) {
    return () => {
      res();
      console.log(`[T-FWK] Span ${spanName} resolved after ${Date.now() - startMs}ms.`);
    };
  }

  waitForSpanAsync(spanName: string, timeoutMs: number = 200): Promise<void> {
    const startWait = Date.now();

    let resolveFunc: (() => void) | undefined;
    let rejectFunc: (reason?: any) => void | undefined;

    const promise = new Promise<void>(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!resolveFunc) {
      throw new Error('An error occurred generating callback. This should _never_ happen.');
    }

    // TODO: Synchronization + Duplicate handling
    this.trackedSpans.set(spanName, ObservableSpanExporter.resolveWrapped(startWait, spanName, resolveFunc));

    const rejectTimeout = setTimeout(
      () => rejectFunc(`Error: Timeout of ${timeoutMs}ms exceeded for span ${spanName}.`),
      timeoutMs
    );
    this.trackedTimeouts.set(spanName, rejectTimeout);

    return promise;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const toResolve = spans.filter((span) => this.trackedSpans.has(span.name));

    if (toResolve.length > 0) {
      console.log(`[T-FWK] Found ${toResolve.length} promises to resolve.`);
      toResolve.forEach((span) => {
        const timeout = this.trackedTimeouts.get(span.name)!;
        clearTimeout(timeout);
        this.trackedTimeouts.delete(span.name);

        const resolveFunc = this.trackedSpans.get(span.name)!;
        resolveFunc();
        this.trackedSpans.delete(span.name);
      });
    }

    resultCallback({
      code: ExportResultCode.SUCCESS
    });
  }
  shutdown(): Promise<void> {
    console.log('[T-FWK] Shutting down observable span exporter');
    return Promise.resolve();
  }

  public static Create(): ObservableSpanExporter {
    return ObservableSpanExporter.instance;
  }
}

export async function createIntegrationTestContext(componentConfiguration?: IComponentConfiguration) {
  return await createPerformanceTestContext(
    1,
    componentConfiguration ?? {
      sensorCount: 5,
      switchCount: 5,
      buttonCount: 5
    }
  );
}
