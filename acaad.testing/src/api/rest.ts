import { IAcaadServer } from './index';
import { createServer } from '@mocks-server/main';
import { openApiRoutes } from '@mocks-server/plugin-openapi';

import openApi from './routes/open-api';
import collections from './collections';
import { getNextPortAsync, getRandomInt, getTestLogger, LogFunc } from '../utility';
import { IComponentConfiguration, IMockedComponentModel, IPortConfiguration } from './types';
import { ComponentDescriptor, ComponentType } from '@acaad/abstractions';

export interface IAcaadApiServer extends IAcaadServer {
  server: any; // TODO

  getRandomComponent(type: ComponentType): ComponentDescriptor;
}

export class AcaadApiServer implements IAcaadApiServer {
  server: any;

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
      log: 'silent'
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

    loadRoutes([...route, ...referencedRoutes]);

    collections[0].routes = referencedRoutes
      // @ts-ignore
      .map((route) => route.variants.map((variant) => `${route.id}:${variant.id}`))
      // @ts-ignore
      .reduce((aggr, curr) => [...aggr, ...curr], []);

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
}
