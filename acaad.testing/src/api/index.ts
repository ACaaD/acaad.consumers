import { createServer } from '@mocks-server/main';
import openApi from './routes/open-api';
import collections from './collections';
import { FakeSignalrHub } from '@fakehost/signalr';
import { createServerSignalr } from '@fakehost/signalr/server';
import { getNextPortAsync } from '../utility';

export interface IAcaadServer {
  startAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
  port: number;
}

export interface IAcaadApiServer extends IAcaadServer {
  server: any; // TODO
}

export interface IAcaadSignalRServer extends IAcaadServer {}

export class AcaadApiServer implements IAcaadApiServer {
  server: any;

  public port: number;
  public adminPort: number;

  private constructor(port: number, adminPort: number, selectedCollection: string) {
    this.port = port;
    this.adminPort = adminPort;

    this.server = createServer({
      server: {
        port: port
      },
      mock: {
        collections: {
          selected: selectedCollection
        }
      },
      plugins: {
        adminApi: {
          port: adminPort
        }
      }
    });
  }

  async startAsync(): Promise<void> {
    await this.server.start();
    const { loadRoutes, loadCollections } = this.server.mock.createLoaders();
    loadRoutes(openApi);
    loadCollections(collections);
  }

  async disposeAsync(): Promise<void> {
    await this.server.stop();
  }

  public static createMockServerAsync = async (selectedCollection = 'positive') => {
    const nextFreePort = await getNextPortAsync();
    const adminPort = await getNextPortAsync();

    return new AcaadApiServer(nextFreePort, adminPort, selectedCollection);
  };
}

export type EventService = {};

export const fakeEventService = new FakeSignalrHub<EventService>('/events');

type SignalRServer = {
  dispose: () => Promise<void>;
};

export class AcaadSignalRServer implements IAcaadSignalRServer {
  private server: SignalRServer;
  public port: number;

  async startAsync(): Promise<void> {}

  async disposeAsync(): Promise<void> {
    await this.server.dispose();
  }

  constructor(port: number, server: SignalRServer) {
    this.port = port;
    this.server = server;
  }

  public static createMockServerAsync: () => Promise<IAcaadSignalRServer> = async () => {
    const nextFreePort = await getNextPortAsync();

    const server: SignalRServer = await createServerSignalr<EventService>({
      port: nextFreePort,
      hubs: { fakeEventService },
      name: 'events'
    });

    return new AcaadSignalRServer(nextFreePort, server);
  };
}
