import { IAcaadServer } from './index';
import { FakeSignalrHub } from '@fakehost/signalr';
import { getNextPortAsync } from '../utility';
import { createServerSignalr } from '@fakehost/signalr/server';
import {
  HttpTransportType,
  HubConnection,
  HubConnectionBuilder,
  ILogger,
  LogLevel
} from '@microsoft/signalr';
import { IPortConfiguration } from './types';

export interface IAcaadSignalRServer extends IAcaadServer {
  pushEvent(event: unknown): Promise<void>;
}

export type EventHub = {
  pushEvent: (event: unknown) => Promise<void>;
};

export type IEventReceiver = {
  receiveEvent: (event: unknown) => Promise<void>;
};

export const fakeEventService = new FakeSignalrHub<EventHub, IEventReceiver>(
  '/events',
  {
    receiveEvent: true
  },
  undefined
);

type SignalRServer = {
  dispose: () => Promise<void>;
};

const hubs = {
  eventHub: fakeEventService
};

function srClientLog(logLevel: LogLevel, message: string) {
  if (logLevel >= LogLevel.Information) {
    console.log(`[M-FWK][${new Date().toISOString()}][${LogLevel[logLevel]}] ${message}`);
  }
}

export class AcaadSignalRController {
  private hubConnection: HubConnection;
  constructor(port: number) {
    const signalrUrl = `http://localhost:${port}/events`;

    this.hubConnection = new HubConnectionBuilder()
      .configureLogging({
        log: srClientLog
      } as ILogger)
      .withUrl(signalrUrl, {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
        withCredentials: false
      })
      .build();

    // Discard for now. Could be checked in the future to verify event was distributed ?
    this.hubConnection.on('receiveEvent', () => undefined);
  }

  public async startAsync() {
    const startMs = Date.now();
    await this.hubConnection.start();
    console.log(`[M-FWK] SignalR controller client connected in ${Date.now() - startMs}ms.`);
  }

  public async disposeAsync() {
    await this.hubConnection.stop();
  }

  public async pushEvent(event: unknown): Promise<void> {
    await this.hubConnection.invoke('pushEvent', event);
  }
}

export class AcaadSignalRServer implements IAcaadSignalRServer {
  private server: SignalRServer;
  private eventHub: FakeSignalrHub<EventHub, IEventReceiver>;
  private controller: AcaadSignalRController;

  public port: number;

  constructor(port: number, server: SignalRServer, eventHub: FakeSignalrHub<EventHub, IEventReceiver>) {
    this.port = port;
    this.server = server;
    this.eventHub = eventHub;

    this.eventHub.register('pushEvent', pushEvent);

    this.controller = new AcaadSignalRController(port);
  }

  async startAsync(): Promise<void> {
    await this.controller.startAsync();
  }

  async disposeAsync(): Promise<void> {
    await this.controller.disposeAsync();
    await this.server.dispose();
  }

  public pushEvent(event: unknown): Promise<void> {
    return this.controller.pushEvent(event);
  }

  public static createMockServerAsync: (ports?: IPortConfiguration) => Promise<IAcaadSignalRServer> = async (
    ports?: IPortConfiguration
  ) => {
    const nextFreePort = ports?.signalr ?? (await getNextPortAsync());

    const server: SignalRServer = await createServerSignalr<typeof hubs>({
      port: nextFreePort,
      hubs: hubs,
      name: 'events'
    });

    return new AcaadSignalRServer(nextFreePort, server, hubs.eventHub);
  };
}

export const pushEvent = async function (this: typeof fakeEventService.thisInstance, event: unknown) {
  console.log('[M-FWK] Received event to distribute.');
  await this.Clients.All.receiveEvent(event);
};
