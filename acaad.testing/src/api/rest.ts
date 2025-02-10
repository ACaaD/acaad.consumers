import { IAcaadServer } from './index';
import { createServer } from '@mocks-server/main';
import openApi from './routes/open-api';
import collections from './collections';
import { getNextPortAsync } from '../utility';

export interface IAcaadApiServer extends IAcaadServer {
  server: any; // TODO
}

export class AcaadApiServer implements IAcaadApiServer {
  server: any;

  private componentCount: number;
  public port: number;
  public adminPort: number;

  private constructor(
    port: number,
    adminPort: number,
    selectedCollection: string,
    componentCount: number = 1
  ) {
    this.port = port;
    this.adminPort = adminPort;

    this.componentCount = componentCount;

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
    loadRoutes(openApi(this.componentCount));
    loadCollections(collections);
  }

  async disposeAsync(): Promise<void> {
    await this.server.stop();
  }

  public static createMockServerAsync = async (
    selectedCollection = 'positive',
    componentCount: number = 1
  ) => {
    const nextFreePort = await getNextPortAsync();
    const adminPort = await getNextPortAsync();

    return new AcaadApiServer(nextFreePort, adminPort, selectedCollection, componentCount);
  };
}
