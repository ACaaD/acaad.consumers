import { AcaadServerMetadata } from './model/open-api';
import { Chunk, Effect, GroupBy, Option, Stream } from 'effect';
import { AcaadHost, Component } from './model';
import { AcaadComponentMetadata } from './model/AcaadComponentManager';

export interface IComponentModel {
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
