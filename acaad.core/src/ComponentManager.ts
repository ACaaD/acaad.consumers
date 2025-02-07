import IConnectedServiceAdapter, { ChangeType } from './interfaces/IConnectedServiceAdapter';
import {
  AcaadPopulatedMetadata,
  AcaadServerMetadata,
  getAcaadMetadata
} from './model/open-api/OpenApiDefinition';
import { AcaadEvent, AcaadPopulatedEvent } from './model/events/AcaadEvent';
import { inject, injectable } from 'tsyringe';
import { DependencyInjectionTokens } from './model/DependencyInjectionTokens';
import { ICsLogger } from './interfaces/IConnectedServiceContext';
import { ConnectionManager } from './ConnectionManager';
import { AcaadError } from './errors/AcaadError';
import {
  Cause,
  Chunk,
  Console,
  Data,
  Effect,
  Either,
  Exit,
  Fiber,
  GroupBy,
  Option,
  pipe,
  Queue,
  Schedule,
  Stream
} from 'effect';
import { CalloutError } from './errors/CalloutError';
import { Semaphore } from 'effect/Effect';
import { Component } from './model/Component';
import { AcaadMetadata } from './model/AcaadMetadata';
import { equals } from 'effect/Equal';
import { RuntimeFiber } from 'effect/Fiber';
import { AcaadHost } from './model/connection/AcaadHost';
import { AcaadServerUnreachableError } from './errors/AcaadServerUnreachableError';
import { ComponentCommandOutcomeEvent } from './model/events/ComponentCommandOutcomeEvent';
import { AcaadComponentMetadata } from './model/AcaadComponentManager';
import { AcaadServerConnectedEvent } from './model/events/AcaadServerConnectedEvent';
import { AcaadServerDisconnectedEvent } from './model/events/AcaadServerDisconnectedEvent';

class MetadataByComponent extends Data.Class<{ component: Component; metadata: AcaadMetadata[] }> {}

interface IComponentModel {
  clearServerMetadata(server: AcaadServerMetadata): Effect.Effect<void>;

  populateServerMetadata(
    server: AcaadServerMetadata,
    components: Stream.Stream<Component>
  ): Effect.Effect<void>;

  getComponentsByServer(): GroupBy.GroupBy<AcaadServerMetadata, Component>;

  getComponentByMetadata(host: AcaadHost, component: AcaadComponentMetadata): Option.Option<Component>;
}

// noinspection JSPotentiallyInvalidUsageOfClassThis
export class ComponentModel implements IComponentModel {
  private _meta = new Map<AcaadServerMetadata, Chunk.Chunk<Component>>();

  public constructor() {
    this.clearServerMetadata = this.clearServerMetadata.bind(this);
    this.populateServerMetadata = this.populateServerMetadata.bind(this);
    this.getComponentsByServer = this.getComponentsByServer.bind(this);
  }

  public clearServerMetadata(server: AcaadServerMetadata): Effect.Effect<boolean> {
    const fountServerOpt = Array.from(this._meta.keys()).find((sm) => sm.host.equals(server.host));

    if (fountServerOpt) {
      this._meta.delete(fountServerOpt);
      return Effect.succeed(true);
    }

    return Effect.succeed(false);
  }

  public getComponentByMetadata(
    host: AcaadHost,
    component: AcaadComponentMetadata
  ): Option.Option<Component> {
    const stream = Stream.fromIterable(this._meta.entries()).pipe(
      Stream.filter(([server, _]) => server.host.host === host.host && server.host.port === host.port),
      Stream.flatMap(([_, components]) => Stream.fromChunk(components)),
      Stream.filter((c) => c.name === component.name && c.type === component.type),
      Stream.runCollect
    );

    return Chunk.get(Effect.runSync(stream), 0);
  }

  public populateServerMetadata(
    server: AcaadServerMetadata,
    components: Stream.Stream<Component>
  ): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const chunk = yield* Stream.runCollect(components);
      this._meta.set(server, chunk);
    });
  }

  public getComponentsByServer(): GroupBy.GroupBy<AcaadServerMetadata, Component> {
    return Stream.fromIterable(this._meta.entries()).pipe(
      Stream.flatMap(([_, components]) => Stream.fromChunk(components)),
      Stream.groupByKey((c) => c.serverMetadata)
    );
  }
}

// noinspection JSPotentiallyInvalidUsageOfClassThis
@injectable()
export class ComponentManager {
  private _serviceAdapter: IConnectedServiceAdapter;
  private _abortController: AbortController;
  private _connectionManager: ConnectionManager;
  private _componentModel: IComponentModel;

  private _metadataByComponent: MetadataByComponent[] = [];

  private _logger: ICsLogger;
  private _eventQueue: Queue.Queue<AcaadPopulatedEvent>;

  public constructor(
    @inject(DependencyInjectionTokens.ConnectedServiceAdapter) serviceAdapter: IConnectedServiceAdapter,
    @inject(DependencyInjectionTokens.ConnectionManager) connectionManager: ConnectionManager,
    @inject(DependencyInjectionTokens.Logger) logger: ICsLogger,
    @inject(DependencyInjectionTokens.EventQueue) eventQueue: Queue.Queue<AcaadPopulatedEvent>,
    @inject(DependencyInjectionTokens.ComponentModel) componentModel: IComponentModel
  ) {
    this._abortController = new AbortController();

    this._connectionManager = connectionManager;
    this._serviceAdapter = serviceAdapter;
    this._componentModel = componentModel;

    this._logger = logger;
    this._eventQueue = eventQueue;

    this.handleOutboundStateChangeAsync = this.handleOutboundStateChangeAsync.bind(this);
    this.processComponentsByServer = this.processComponentsByServer.bind(this);
    this.getServerMetadata = this.getServerMetadata.bind(this);
    this.processSingleComponent = this.processSingleComponent.bind(this);
  }

  private flowEff = Effect.gen(this, function* () {
    const serverMetadata: Stream.Stream<Either.Either<AcaadServerMetadata, AcaadError>> =
      yield* this.queryComponentConfigurations;

    // TODO: Partition by OpenApiDefinition, ResponseSchemaError, ConnectionRefused (or whatever Axios returns)
    // Then continue processing only OpenApiDefinition.
    const partition = serverMetadata.pipe(Stream.partition((e) => Either.isRight(e)));

    const res = Effect.scoped(
      Effect.gen(this, function* () {
        const [failed, openApiDefinitions] = yield* partition;

        const availableServers = openApiDefinitions.pipe(Stream.map((r) => r.right));

        yield* this.reloadComponentMetadataModel(availableServers);

        const createRes = yield* this.updateConnectedServiceModel;

        yield* Stream.runCollect(
          failed.pipe(
            Stream.map((l) => l.left),
            Stream.groupByKey((e) => e._tag),
            GroupBy.evaluate((tag, errors) =>
              Effect.gen(this, function* () {
                // TODO: Improve error handling :)

                if (tag === AcaadServerUnreachableError.Tag) {
                  const unreachableErrors = yield* Stream.runCollect(
                    errors.pipe(
                      Stream.map((e) => e as AcaadServerUnreachableError),
                      Stream.map(
                        (unreachable) =>
                          `'${unreachable.host.friendlyName}'->${unreachable.host.host}:${unreachable.host.port}`
                      )
                    )
                  );

                  this._logger.logWarning(
                    `The following server(s) are unreachable: [${Chunk.toArray(unreachableErrors).join(', ')}]`
                  );
                  return Effect.succeed(undefined);
                }

                const errorsChunked = Stream.runCollect(errors);
                return Effect.fail(
                  new AcaadError(
                    errorsChunked,
                    'One or more unhandled errors occurred. This should never happen.'
                  )
                );
              })
            )
          )
        );
      })
    );

    return yield* res;
  });

  public async createMissingComponentsAsync(): Promise<boolean> {
    this._logger.logInformation('Syncing components from ACAAD servers.');

    const result = await Effect.runPromiseExit(this.flowEff);

    return Exit.match(result, {
      onFailure: (cause) => {
        this._logger.logWarning(`Exited with failure state: ${Cause.pretty(cause)}`, cause.toJSON());
        return false;
      },
      onSuccess: (_) => {
        this._logger.logInformation('Successfully created missing components.');
        return true;
      }
    });
  }

  private getServerMetadata(host: AcaadHost): Effect.Effect<Either.Either<AcaadServerMetadata, AcaadError>> {
    return Effect.gen(this, function* () {
      const metadata = yield* this._connectionManager.queryComponentConfigurationAsync(host);

      return Either.map(
        metadata,
        (openApi) =>
          ({
            ...openApi,
            friendlyName: host.friendlyName,
            host: host
          }) as AcaadServerMetadata
      );
    });
  }

  readonly queryComponentConfigurations = Effect.gen(this, function* () {
    const configuredServers: AcaadHost[] = yield* this._connectionManager.getHosts;
    const concurrency = this._serviceAdapter.getAllowedConcurrency();

    return Stream.fromIterable(configuredServers).pipe(
      Stream.mapEffect(this.getServerMetadata, {
        concurrency
      })
    );
  });

  createComponentHierarchy = (
    allMetadata: Stream.Stream<AcaadPopulatedMetadata>
  ): Stream.Stream<Option.Option<Component>> => {
    return allMetadata.pipe(
      Stream.groupByKey((m) => `${m.serverMetadata.host.friendlyName}.${m.component.name}`),
      GroupBy.evaluate((key: string, metadata: Stream.Stream<AcaadPopulatedMetadata>) =>
        Effect.gen(function* () {
          const m = yield* Stream.runCollect(metadata);
          return Component.fromMetadata(m);
        })
      )
    );
  };

  private reloadComponentMetadataModel(serverMetadata: Stream.Stream<AcaadServerMetadata>) {
    return Effect.gen(this, function* () {
      const tmp = serverMetadata.pipe(
        Stream.tap(this._componentModel.clearServerMetadata),
        Stream.flatMap(getAcaadMetadata),
        this.createComponentHierarchy,
        Stream.filter((cOpt) => Option.isSome(cOpt)),
        Stream.map((cSome) => cSome.value),
        Stream.groupByKey((c) => c.serverMetadata),
        GroupBy.evaluate(this._componentModel.populateServerMetadata)
      );

      return yield* Stream.runCollect(tmp);
    });
  }

  private updateConnectedServiceModel = Effect.gen(this, function* () {
    const sem = yield* Effect.makeSemaphore(this._serviceAdapter.getAllowedConcurrency());

    const start = Date.now();
    const stream = this._componentModel.getComponentsByServer().pipe(
      GroupBy.evaluate((server, components) =>
        Effect.gen(this, function* () {
          yield* this.processServerWithSemaphore(server, sem);
          return yield* this.processComponentsWithSemaphore(server.host.friendlyName, components, sem);
        })
      )
    );

    const chunked = yield* Stream.runCollect(stream);
    const flattened = Chunk.flatMap(chunked, (r) => r);

    this._logger.logInformation(
      `Processing ${flattened.length} components of ${chunked.length} servers took ${Date.now() - start}ms.`
    );

    return chunked;
  });

  private processServerWithSemaphore(
    server: AcaadServerMetadata,
    sem: Semaphore
  ): Effect.Effect<void, AcaadError> {
    return Effect.gen(this, function* () {
      yield* sem.take(1);
      const eff = Effect.tryPromise({
        try: () => this._serviceAdapter.createServerModelAsync(server),
        catch: (error) => new CalloutError(error) as AcaadError
      });
      yield* sem.release(1);

      return yield* eff;
    });
  }

  private processComponentsWithSemaphore(key: string, stream: Stream.Stream<Component>, sem: Semaphore) {
    return Effect.gen(this, function* () {
      yield* sem.take(1);
      this._logger.logDebug(`Processing components for server: '${key}'.`);
      const res = this.processComponentsByServer(key, stream);
      yield* sem.release(1);

      return yield* res;
    });
  }

  private processComponentsByServer(
    key: string,
    stream: Stream.Stream<Component>
  ): Effect.Effect<Chunk.Chunk<string>, AcaadError> {
    return Effect.gen(this, function* () {
      return yield* Stream.runCollect(stream.pipe(Stream.mapEffect(this.processSingleComponent)));
    });
  }

  private processSingleComponent(cmp: Component): Effect.Effect<string, AcaadError> {
    return Effect.gen(this, function* () {
      yield* Effect.tryPromise({
        try: () => this._serviceAdapter.createComponentModelAsync(cmp),
        catch: (error) => new CalloutError(error)
      });

      return cmp.name;
    });
  }

  async handleOutboundStateChangeAsync(
    component: Component,
    type: ChangeType,
    value: Option.Option<unknown>
  ): Promise<boolean> {
    this._logger.logDebug(
      `Handling outbound state (type=${type}) change for component ${component.name} and value ${value}.`
    );

    const metadadataFilter = this.getMetadataFilter(type, value);

    const potentialMetadata = Stream.fromIterable(component.metadata).pipe(Stream.filter(metadadataFilter));

    const result = await Effect.runPromiseExit(
      this.getMetadataToExecuteOpt(potentialMetadata).pipe(
        Effect.andThen((m) => this._connectionManager.updateComponentStateAsync(m))
      )
    );

    Exit.match(result, {
      onFailure: (cause) =>
        this._logger.logError(
          cause,
          undefined,
          `Outbound state change handling failed for component ${component.name}.`
        ),
      onSuccess: (_) => {
        this._logger.logInformation(`Successfully updated outbound state for component ${component.name}.`);
      }
    });

    return Exit.isSuccess(result);
  }

  handleInboundStateChangeAsync(event: AcaadPopulatedEvent): Effect.Effect<void, CalloutError> {
    const isComponentCommandOutcomeEvent = (e: AcaadEvent): e is ComponentCommandOutcomeEvent =>
      e.name === 'ComponentCommandOutcomeEvent';

    return Effect.gen(this, function* () {
      if (!isComponentCommandOutcomeEvent(event)) {
        return;
      }

      this._logger.logTrace(
        `Received event '${event.name}::${event.component.name}' from host ${event.host.friendlyName}`
      );

      const component = this._componentModel.getComponentByMetadata(event.host, event.component);

      if (Option.isSome(component)) {
        const cd = this._serviceAdapter.getComponentDescriptorByComponent(component.value);

        yield* Effect.tryPromise({
          try: () => this._serviceAdapter.updateComponentStateAsync(cd, event.outcome),
          catch: (error) => new CalloutError('An error occurred updating component state..', error)
        });
      } else {
        this._logger.logWarning(
          `Received event for unknown component '${event.name}' from host ${event.host.friendlyName}`
        );
      }
    });
  }

  private getMetadataToExecuteOpt(
    stream: Stream.Stream<AcaadPopulatedMetadata>
  ): Effect.Effect<AcaadPopulatedMetadata, AcaadError> {
    return Effect.gen(this, function* () {
      const metadata = yield* Stream.runCollect(stream);

      if (metadata.length === 0) {
        const msg = 'No executable metadata/endpoint information found for component.';
        this._logger.logWarning(msg);
        return yield* Effect.fail(new CalloutError(msg));
      }
      if (metadata.length > 1) {
        const msg = 'Identified too many metadata applicable for execution. Do not know what to do.';
        this._logger.logWarning(msg);
        return yield* Effect.fail(new CalloutError(msg));
      }

      return Chunk.toArray(metadata)[0];
    });
  }

  private getMetadataFilter(type: ChangeType, v: Option.Option<unknown>): (m: AcaadMetadata) => boolean {
    switch (type) {
      case 'action':
        return (m) =>
          !!m.actionable &&
          // Match provided (CS) value only if the metadata specifically defines a reference value.
          // If not defined in metadata, ignore value coming from CS.
          (Option.isNone(m.forValue) || (Option.isSome(m.forValue) && equals(m.forValue, v)));
      case 'query':
        return (m) => !!m.queryable;
    }
  }

  async startAsync(): Promise<void> {
    this._logger.logInformation('Starting component manager.');

    const startEff = pipe(
      this.startEventListener,
      Effect.andThen(this._connectionManager.startMissingHubConnections),
      Effect.andThen(
        Effect.tryPromise({
          try: (as) =>
            this._serviceAdapter.registerStateChangeCallbackAsync(this.handleOutboundStateChangeAsync, as),
          catch: (error) => new CalloutError('An error occurred registering state change callback.', error)
        })
      )
    );
    const result = await Effect.runPromiseExit(startEff);

    Exit.match(result, {
      onFailure: (cause) =>
        this._logger.logError(cause, undefined, `An error occurred starting component manager.`),
      onSuccess: (_) => {
        this._logger.logInformation(`Started component manager. Listening for events..`);
      }
    });
  }

  private listenerFiber: RuntimeFiber<void | number> | null = null;
  private startEventListener = Effect.gen(this, function* () {
    this.listenerFiber = yield* Effect.forkDaemon(
      // TODO: Use error handler (potentially sharable with comp. model creation)
      this.runEventListener.pipe(
        Effect.onError((err) => {
          if (Cause.isInterruptType(err)) {
            this._logger.logDebug(
              'Event listener fiber was interrupted. This is normal in a graceful shutdown.'
            );
            return Effect.void;
          }

          this._logger.logError(err, undefined, 'An error occurred processing event.');
          return Effect.void;
        }),
        Effect.either,
        Effect.repeat(Schedule.forever)
      )
    );
  });

  private runEventListener = Effect.gen(this, function* () {
    const event = yield* Queue.take(this._eventQueue);

    if (event.name === 'ComponentCommandOutcomeEvent') {
      return yield* this.handleInboundStateChangeAsync(event);
    }

    // TODO: Wrong error raised
    if (event.name === AcaadServerConnectedEvent.Tag) {
      return yield* Effect.tryPromise({
        try: () => this._serviceAdapter.onServerConnectedAsync(event.host),
        catch: (error) => new CalloutError('An error occurred handling server connected event.', error)
      });
    }

    // TODO: Wrong error raised
    if (event.name === AcaadServerDisconnectedEvent.Tag) {
      return yield* Effect.tryPromise({
        try: () => this._serviceAdapter.onServerDisconnectedAsync(event.host),
        catch: (error) => new CalloutError('An error occurred handling server connected event.', error)
      });
    }

    this._logger.logTrace(`Discarded unhandled event: '${event.name}'`);
    return yield* Effect.void;
  });

  private shutdownEventQueue = Effect.gen(this, function* () {
    yield* Queue.shutdown(this._eventQueue);
  });

  private stopEff = Effect.gen(this, function* () {
    const connections = yield* this._connectionManager.stopHubConnections;
    const eventQueue = yield* this.shutdownEventQueue;

    if (this.listenerFiber !== null) {
      yield* Fiber.interrupt(this.listenerFiber);
    }
  });

  async shutdownAsync(): Promise<void> {
    this._logger.logInformation('Stopping component manager.');

    const exit = await Effect.runPromiseExit(this.stopEff);

    Exit.match(exit, {
      onFailure: (cause) =>
        this._logger.logError(cause, undefined, `An error occurred stopping component manager.`),
      onSuccess: (_) => {
        this._logger.logInformation(`Successfully stopped component manager.`);
      }
    });
  }
}
