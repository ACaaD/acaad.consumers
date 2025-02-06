import portfinder from 'portfinder';
import { createServer } from '@mocks-server/main';
import openApi from './routes/open-api';
import collections from './collections';

const asyncDisposables = [];

export interface IAcaadApiServer {
  server: any; // TODO

  port: number;

  startAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
}

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
    const nextFreePort = await portfinder.getPortPromise({ port: 8_000 });
    const adminPort = await portfinder.getPortPromise({ port: 20_000 });

    return new AcaadApiServer(nextFreePort, adminPort, selectedCollection);
  };
}
