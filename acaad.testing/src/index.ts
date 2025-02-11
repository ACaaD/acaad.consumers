import { AcaadApiServer, AcaadSignalRServer, IAcaadApiServer, IAcaadSignalRServer } from './api';
import { AcaadAuthentication, AcaadHost, ComponentDescriptor, ComponentType } from '@acaad/abstractions';
import { v4 as uuidv4 } from 'uuid';
import { IComponentConfiguration } from './api/types';

export { IComponentConfiguration, IAcaadServer } from './api/types';

export {
  AcaadApiServer,
  IAcaadApiServer,
  AcaadSignalRServer,
  IAcaadSignalRServer,
  IEventReceiver
} from './api';
export { delay, getRandomInt } from './utility';

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
    componentConfiguration: IComponentConfiguration
  ): Promise<ServerMocks> {
    const [apiServer, signalrServer] = await Promise.all([
      AcaadApiServer.createMockServerAsync(selectedCollection, componentConfiguration),
      AcaadSignalRServer.createMockServerAsync()
    ]);

    return new ServerMocks(apiServer, signalrServer);
  }

  public getRandomComponent(type: ComponentType): ComponentDescriptor {
    return this.apiServer.getRandomComponent(type);
  }

  public getHost(): AcaadHost {
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
