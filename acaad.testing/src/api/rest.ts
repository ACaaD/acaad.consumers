import { IAcaadServer } from './index';
import { createServer } from '@mocks-server/main';
import { openApiRoutes } from '@mocks-server/plugin-openapi';

import openApi from './routes/open-api';
import collections from './collections';
import { getNextPortAsync, getRandomInt, getTestLogger, LogFunc } from '../utility';
import { IComponentConfiguration, IMockedComponentModel, IPortConfiguration } from './types';
import { ComponentDescriptor, ComponentType, TraceInfo } from '@acaad/abstractions';

export class TrackedRequest {
  url: string;
  method: string;
  headers: unknown;
  body: unknown;
  traceParent: string | undefined;
  traceInfo: TraceInfo | undefined;

  constructor(req: any) {
    this.url = req.url;
    this.method = req.method;
    this.headers = req.headers;
    this.body = req.body;

    this.traceParent = (this.headers as any).traceparent;

    if (this.traceParent) {
      this.traceInfo = new TraceInfo(this.traceParent);
    }
  }

  getTraceId(): string | undefined {
    return this.traceInfo?.traceId;
  }

  getSpanId(): string | undefined {
    return this.traceInfo?.spanId;
  }
}

export interface IAcaadApiServer extends IAcaadServer {
  getRandomComponent(type: ComponentType): ComponentDescriptor;

  enableRequestTracking(): void;
  getTrackedRequests(traceId?: string, spanId?: string): TrackedRequest[];
  clearTrackedRequests(): void;
}

export class AcaadApiServer implements IAcaadApiServer {
  private server: any;

  private readonly componentConfiguration: IComponentConfiguration;
  public port: number;
  public adminPort: number;

  private componentModel: IMockedComponentModel;
  private log: LogFunc;

  private constructor(
    port: number,
    adminPort: number,
    selectedCollection: string,
    componentConfiguration: IComponentConfiguration
  ) {
    this.log = getTestLogger('Api');

    this.port = port;
    this.adminPort = adminPort;

    this.componentConfiguration = componentConfiguration;
    this.componentModel = AcaadApiServer.createComponentModel(componentConfiguration);

    this.requestTrackingMiddleware = this.requestTrackingMiddleware.bind(this);

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
      },
      // @ts-ignore
      log: global.__ENABLE_TEST_FWK_LOGS__ ? 'info' : 'silent'
    });
  }

  private static createComponentModel(
    componentConfiguration: IComponentConfiguration
  ): IMockedComponentModel {
    const prefix = componentConfiguration.componentPrefix ?? '';

    return {
      sensors: Array.from({ length: componentConfiguration.sensorCount ?? 0 }).map(
        (_, idx) => new ComponentDescriptor(`${prefix}sensor-${idx}`)
      ),
      buttons: Array.from({ length: componentConfiguration.buttonCount ?? 0 }).map(
        (_, idx) => new ComponentDescriptor(`${prefix}button-${idx}`)
      ),
      switches: Array.from({ length: componentConfiguration.switchCount ?? 0 }).map(
        (_, idx) => new ComponentDescriptor(`${prefix}switch-${idx}`)
      )
    };
  }

  public getRandomComponent(type: ComponentType): ComponentDescriptor {
    if (type === ComponentType.Sensor) {
      return AcaadApiServer.getRandomComponentInternal('sensor', this.componentModel.sensors);
    } else if (type === ComponentType.Button) {
      return AcaadApiServer.getRandomComponentInternal('button', this.componentModel.buttons);
    } else if (type === ComponentType.Switch) {
      return AcaadApiServer.getRandomComponentInternal('switch', this.componentModel.switches);
    } else {
      throw new Error(
        `Invalid type ${type}. Was it newly introduced? This needs to be fixed in the '@acaad/testing' project.`
      );
    }
  }

  private static getRandomComponentInternal(name: string, cdArray?: ComponentDescriptor[]) {
    const length = cdArray?.length ?? 0;

    if (length < 1) {
      throw new Error(
        `Cannot retrieve random ${name}. The passed configuration did define ${name}s to be generated.`
      );
    }

    const idx = getRandomInt(length - 1);
    return cdArray![idx];
  }

  async startAsync(): Promise<void> {
    await this.server.start();
    const { loadRoutes, loadCollections } = this.server.mock.createLoaders();
    const { route, openApiBody } = openApi(this.componentModel);

    const referencedRoutes =
      this.componentConfiguration.suppressComponentEndpoints !== true
        ? await openApiRoutes({
            basePath: '/',
            document: { ...openApiBody }
          })
        : [];

    const middlewareVariantId = 'request-tracking-middleware';
    const globalMiddlewareRoute = {
      id: 'global-middleware',
      url: '*',
      method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      variants: [
        {
          id: middlewareVariantId,
          type: 'middleware',
          options: {
            middleware: this.requestTrackingMiddleware
          }
        }
      ]
    };

    const allRoutes = [globalMiddlewareRoute, ...route, ...referencedRoutes];

    loadRoutes(allRoutes);

    const defaultRoutes = [`${globalMiddlewareRoute.id}:${middlewareVariantId}`];

    collections[0].routes = referencedRoutes
      // @ts-ignore
      .map((route) => route.variants.map((variant) => `${route.id}:${variant.id}`))
      // @ts-ignore
      .reduce((aggr, curr) => [...aggr, ...curr], defaultRoutes);

    loadCollections(collections);
  }

  async disposeAsync(): Promise<void> {
    await this.server.stop();
  }

  public static createMockServerAsync = async (
    selectedCollection = 'positive',
    componentConfiguration: IComponentConfiguration,
    ports?: IPortConfiguration
  ) => {
    const nextFreePort = ports?.api ?? (await getNextPortAsync());
    const adminPort = ports?.adminApi ?? (await getNextPortAsync());

    return new AcaadApiServer(nextFreePort, adminPort, selectedCollection, componentConfiguration);
  };

  private requestTrackingMiddleware(req: any, res: any, next: any, core: any) {
    this.log(`Request to ${req.url} received at ${new Date().toISOString()}`);

    if (this.withRequestTracking) {
      if (req.url === '/_/requests/tracked' && req.method === 'GET') {
        res.status(200);
        res.send(this.trackedRequests);
        return;
      }

      const url = req.url as string;
      if (url.startsWith('/_/requests/tracked/') && req.method === 'GET') {
        const traceId = url.split('/').at(-1);

        if (traceId) {
          res.status(200);
          res.send(this.getTrackedRequest(traceId));
          return;
        }
      }

      this.log(`Tracked request to ${req.url} received at ${new Date().toISOString()}`);
      this.trackedRequests.push(new TrackedRequest(req));
    }

    next();
  }

  trackedRequests: TrackedRequest[] = [];
  withRequestTracking: boolean = false;

  enableRequestTracking(): void {
    this.log('Enabling request tracking.');
    this.withRequestTracking = true;
  }

  getTrackedRequests(traceId?: string, spanId?: string): TrackedRequest[] {
    if (!this.withRequestTracking) {
      throw new Error('Request tracking is not enabled.');
    }

    let collection = this.trackedRequests;

    if (traceId) {
      collection = collection.filter((tr) => tr.getTraceId() === traceId);
    }

    if (spanId) {
      collection = collection.filter((tr) => tr.getSpanId() === spanId);
    }

    return collection;
  }

  getTrackedRequest(traceId: string): TrackedRequest[] {
    if (!this.withRequestTracking) {
      throw new Error('Request tracking is not enabled.');
    }

    return this.trackedRequests.filter((tr) => tr.getTraceId() === traceId);
  }

  clearTrackedRequests() {
    this.log('Clearing tracked requests.');
    this.trackedRequests = [];
  }
}
