// This must be executed before any access to the actual container.
import 'reflect-metadata';

import { AcaadPopulatedEvent, IConnectedServiceContext } from '@acaad/abstractions';

import {
  ClassProvider,
  container,
  DependencyContainer,
  InjectionToken,
  Lifecycle,
  RegistrationOptions,
  registry,
  ValueProvider
} from 'tsyringe';
import { ComponentManager } from './ComponentManager';
import { ConnectionManager } from './ConnectionManager';
import { DependencyInjectionTokens } from './model/DependencyInjectionTokens';
import { InMemoryTokenCache } from './services/InMemoryTokenCache';
import { Effect, Layer, Queue } from 'effect';
import { NodeSdk } from '@effect/opentelemetry';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  NoopSpanProcessor,
  SimpleSpanProcessor,
  SpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { SpanExporter } from '@opentelemetry/sdk-trace-base/build/src/export/SpanExporter';

import { MetadataModel } from './MetadataModel';
import { Configuration } from '@effect/opentelemetry/src/NodeSdk';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { QueueWrapper } from './QueueWrapper';

function noopExporterFactory(container: DependencyContainer): SpanProcessor {
  return new NoopSpanProcessor();
}

function singleExporterFactory(container: DependencyContainer): SpanProcessor {
  const exporter = container.resolve(DependencyInjectionTokens.OpenTelExporter) as SpanExporter;
  return new SimpleSpanProcessor(exporter);
}

function batchExporterFactory(container: DependencyContainer): SpanProcessor {
  const exporter = container.resolve(DependencyInjectionTokens.OpenTelExporter) as SpanExporter;
  return new BatchSpanProcessor(exporter);
}

@registry([
  { token: ComponentManager, useClass: ComponentManager, options: { lifecycle: Lifecycle.ResolutionScoped } },
  {
    token: DependencyInjectionTokens.ConnectionManager,
    useClass: ConnectionManager,
    options: { lifecycle: Lifecycle.ResolutionScoped }
  },
  {
    token: DependencyInjectionTokens.MetadataModel,
    useClass: MetadataModel,
    options: { lifecycle: Lifecycle.ResolutionScoped }
  },
  { token: DependencyInjectionTokens.TokenCache, useClass: InMemoryTokenCache },
  {
    token: DependencyInjectionTokens.Logger,
    useFactory: (c) => c.resolve<IConnectedServiceContext>(DependencyInjectionTokens.Context).logger
  },
  {
    token: DependencyInjectionTokens.EventQueue,
    useClass: QueueWrapper,
    options: { lifecycle: Lifecycle.ResolutionScoped }
  },
  {
    token: DependencyInjectionTokens.OpenTelExporter,
    useFactory: (_) =>
      new OTLPTraceExporter({
        url: 'http://localhost:4317'
      })
  },
  {
    token: DependencyInjectionTokens.OpenTelProcessor,
    useFactory: batchExporterFactory
  },
  {
    token: DependencyInjectionTokens.OpenTelLayer,
    useFactory: (container) => () => {
      const processor = container.resolve(DependencyInjectionTokens.OpenTelProcessor) as SpanProcessor;

      const layer: Configuration = {
        resource: { serviceName: 'acaad' },
        spanProcessor: processor
      };

      const layerLayer = NodeSdk.layer(() => layer);
      return layerLayer.pipe(
        Layer.catchAll((err) => {
          console.log('An error with the open-tel layer occurred');
          console.error(err);

          const layerFallback: Configuration = {
            resource: { serviceName: 'acaad' },
            spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
          };

          return NodeSdk.layer(() => layerFallback);
        })
      );
    }
  }
])
export class FrameworkContainer {
  private static Container: DependencyContainer = container;

  private _childContainer: DependencyContainer;
  private _isBuilt: boolean = false;

  constructor(childContainer: DependencyContainer) {
    this._childContainer = childContainer;
  }

  public static CreateCsContainer<T>(
    classProvider?: ClassProvider<T>,
    valueProvider?: ValueProvider<T>,
    options?: RegistrationOptions
  ): FrameworkContainer {
    const childContainer = FrameworkContainer.Container.createChildContainer();

    if (classProvider) {
      childContainer.register<T>(DependencyInjectionTokens.ConnectedServiceAdapter, classProvider, options);
    } else if (valueProvider) {
      childContainer.register(DependencyInjectionTokens.ConnectedServiceAdapter, valueProvider);
    } else {
      throw new Error('Either classProvider or valueProvider must be provided');
    }

    return new FrameworkContainer(childContainer);
  }

  public WithContext<T extends IConnectedServiceContext>(
    token: InjectionToken<T>,
    value: T
  ): FrameworkContainer {
    this.ThrowIffBuilt();

    this._childContainer.register<IConnectedServiceContext>(DependencyInjectionTokens.Context, {
      useValue: value
    });
    this._childContainer.register<T>(token, { useValue: value });

    return this;
  }

  public WithOpenTelemtry(
    processorType: 'single' | 'batch',
    exporterFactory: (container: DependencyContainer) => SpanExporter
  ): FrameworkContainer {
    this.ThrowIffBuilt();

    this._childContainer.register(DependencyInjectionTokens.OpenTelProcessor, {
      useFactory: processorType === 'single' ? singleExporterFactory : batchExporterFactory
    });

    this._childContainer.register(DependencyInjectionTokens.OpenTelExporter, {
      useFactory: exporterFactory
    });

    return this;
  }

  public Build(): DependencyContainer {
    this.ThrowIffBuilt();
    return this._childContainer;
  }

  private ThrowIffBuilt(): void {
    if (this._isBuilt) {
      throw new Error('Container has already been built');
    }
  }
}
