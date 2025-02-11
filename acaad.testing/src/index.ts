import { AcaadApiServer, AcaadSignalRServer, IAcaadApiServer, IAcaadSignalRServer } from './api';
import { AcaadAuthentication, AcaadHost } from '@acaad/abstractions';
import { v4 as uuidv4 } from 'uuid';

export {
  AcaadApiServer,
  IAcaadApiServer,
  AcaadSignalRServer,
  IAcaadSignalRServer,
  IEventReceiver
} from './api';
export { delay } from './utility';

export class ServerMocks {
  serverName: string;
  apiServer: IAcaadApiServer;
  signalrServer: IAcaadSignalRServer;

  constructor(apiServer: IAcaadApiServer, signalrServer: IAcaadSignalRServer) {
    this.serverName = `mock-${uuidv4()}`;

    this.apiServer = apiServer;
    this.signalrServer = signalrServer;
  }

  static async createMockServersAsync(
    selectedCollection = 'positive',
    componentCount: number = 1
  ): Promise<ServerMocks> {
    const [apiServer, signalrServer] = await Promise.all([
      AcaadApiServer.createMockServerAsync(selectedCollection, componentCount),
      AcaadSignalRServer.createMockServerAsync()
    ]);

    return new ServerMocks(apiServer, signalrServer);
  }

  getHost(): AcaadHost {
    const auth = new AcaadAuthentication('', '', '', []);
    return new AcaadHost(this.serverName, 'localhost', this.apiServer.port, auth, this.signalrServer.port);
  }

  public async startAsync() {
    return await Promise.all([this.apiServer.startAsync(), this.signalrServer.startAsync()]);
  }

  public async disposeAsync() {
    return await Promise.all([this.apiServer.disposeAsync(), this.signalrServer.disposeAsync()]);
  }
}
