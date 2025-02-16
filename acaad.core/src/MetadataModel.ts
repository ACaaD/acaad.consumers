import { Chunk, Effect, GroupBy, Option, Stream } from 'effect';
import { inject, injectable } from 'tsyringe';

import {
  AcaadServerMetadata,
  AcaadHost,
  Component,
  ComponentDescriptor,
  AcaadComponentMetadata,
  IConnectedServiceAdapter
} from '@acaad/abstractions';
import { DependencyInjectionTokens } from './model/DependencyInjectionTokens';
export interface IMetadataModel {
  clearServerMetadata(server: AcaadServerMetadata): Effect.Effect<void>;

  populateServerMetadata(
    server: AcaadServerMetadata,
    components: Stream.Stream<Component>
  ): Effect.Effect<void>;

  getComponentsByServer(): GroupBy.GroupBy<AcaadServerMetadata, Component>;

  getComponentByMetadata(host: AcaadHost, component: AcaadComponentMetadata): Option.Option<Component>;
  getComponentByDescriptor(
    host: AcaadHost,
    componentDescriptor: ComponentDescriptor
  ): Option.Option<Component>;

  onServerMetadataSynced(host: AcaadHost): void;
  getLastSyncByServer(host: AcaadHost): number | undefined;
}

// noinspection JSPotentiallyInvalidUsageOfClassThis
@injectable()
export class MetadataModel implements IMetadataModel {
  private _serviceAdapter: IConnectedServiceAdapter;
  private _meta = new Map<AcaadServerMetadata, Chunk.Chunk<Component>>();
  private _componentByDescriptor = new Map<AcaadServerMetadata, Map<ComponentDescriptor, Component>>();

  private _lastSyncByServer: Map<string, number> = new Map<string, number>();

  public constructor(
    @inject(DependencyInjectionTokens.ConnectedServiceAdapter) serviceAdapter: IConnectedServiceAdapter
  ) {
    this._serviceAdapter = serviceAdapter;

    this.clearServerMetadata = this.clearServerMetadata.bind(this);
    this.populateServerMetadata = this.populateServerMetadata.bind(this);
    this.getComponentsByServer = this.getComponentsByServer.bind(this);
  }

  onServerMetadataSynced(host: AcaadHost): void {
    this._lastSyncByServer.set(host.friendlyName, Date.now());
  }

  getLastSyncByServer(host: AcaadHost): number | undefined {
    return this._lastSyncByServer.get(host.friendlyName);
  }

  public clearServerMetadata(server: AcaadServerMetadata): Effect.Effect<boolean> {
    const foundServerOpt = Array.from(this._meta.keys()).find((sm) => sm.host.equals(server.host));

    if (foundServerOpt) {
      this._meta.delete(foundServerOpt);
    }

    const foundMappingOpt = Array.from(this._componentByDescriptor.keys()).find((sm) =>
      sm.host.equals(server.host)
    );
    if (foundMappingOpt) {
      this._componentByDescriptor.delete(foundMappingOpt);
    }

    return foundServerOpt && foundMappingOpt ? Effect.succeed(true) : Effect.succeed(false);
  }

  public getComponentByDescriptor(
    host: AcaadHost,
    componentDescriptor: ComponentDescriptor
  ): Option.Option<Component> {
    const stream = Stream.fromIterable(this._componentByDescriptor.entries()).pipe(
      Stream.filter(([server, _]) => server.host.host === host.host && server.host.port === host.port),
      Stream.flatMap(([_, components]) => Stream.fromIterable(Array.from(components.entries()))),
      Stream.filter(([cd, _]) => componentDescriptor.is(cd)),
      Stream.map(([_, c]) => c),
      Stream.runCollect
    );

    return Chunk.get(Effect.runSync(stream), 0);
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

      const componentByDescriptor = yield* Stream.fromIterable(chunk).pipe(
        Stream.runFold(new Map<ComponentDescriptor, Component>(), (aggregate, curr) => {
          aggregate.set(this._serviceAdapter.getComponentDescriptorByComponent(curr), curr);
          return aggregate;
        })
      );

      this._meta.set(server, chunk);
      this._componentByDescriptor.set(server, componentByDescriptor);
    });
  }

  public getComponentsByServer(): GroupBy.GroupBy<AcaadServerMetadata, Component> {
    return Stream.fromIterable(this._meta.entries()).pipe(
      Stream.flatMap(([_, components]) => Stream.fromChunk(components)),
      Stream.groupByKey((c) => c.serverMetadata)
    );
  }
}
