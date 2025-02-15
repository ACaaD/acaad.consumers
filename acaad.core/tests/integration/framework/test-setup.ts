import { mock, Mock } from 'ts-jest-mocker';
import { IConnectedServiceAdapter, IConnectedServiceContext, ICsLogger } from '@acaad/abstractions';
import { ComponentManager, FrameworkContainer } from '../../../src';
import { DependencyContainer } from 'tsyringe';
import { ServerMocks } from '@acaad/testing';
import { IAcaadIntegrationTestContext } from '../types';
import { IComponentConfiguration, getTestLogger as getBaseLogger, LogFunc } from '@acaad/testing';
import { setupConnectedServiceMock } from '../mocks/MockServiceAdapter';
import { ObservableSpanExporter } from '../mocks/ObservableSpanExporter';
import { AcaadIntegrationTestContext } from './AcaadIntegrationTestContext';

export function getTestLogger(name: string): LogFunc {
  return getBaseLogger(name, 'T-FWK');
}

export async function createPerformanceTestContext(
  serverCount: number,
  componentConfiguration: IComponentConfiguration,
  loggerToUse?: ICsLogger,
  serverMultiplier: number = 1
) {
  const enumerable = Array.from({ length: serverCount });

  const serviceAdapterMock: Mock<IConnectedServiceAdapter> = mock<IConnectedServiceAdapter>();
  const serviceContextMock: Mock<IConnectedServiceContext> = mock<IConnectedServiceContext>();

  const loggerMock = mock<ICsLogger>();
  serviceContextMock.logger = loggerToUse ?? loggerMock;

  const serverMocks = await Promise.all(
    enumerable.map((_) => ServerMocks.createMockServersAsync(undefined, componentConfiguration))
  );

  const stateObserver = ObservableSpanExporter.Create();
  const fwkContainer: DependencyContainer = FrameworkContainer.CreateCsContainer<IConnectedServiceAdapter>(
    undefined,
    {
      useValue: serviceAdapterMock
    }
  )
    .WithContext<IConnectedServiceContext>('mock-context', serviceContextMock)
    // .WithOpenTelemtry('single', (_) => stateObserver)
    .Build();

  const instance: ComponentManager = fwkContainer.resolve(ComponentManager) as ComponentManager;

  const intTestContext: IAcaadIntegrationTestContext = new AcaadIntegrationTestContext(
    serverMocks,
    fwkContainer,
    instance,
    serviceAdapterMock,
    serviceContextMock,
    stateObserver,
    loggerToUse === undefined ? loggerMock : undefined
  );

  setupConnectedServiceMock(intTestContext, serverMultiplier);

  return intTestContext;
}

export async function createIntegrationTestContext(
  serverCount: number = 1,
  componentConfiguration?: IComponentConfiguration,
  loggerToUse?: ICsLogger
) {
  return await createPerformanceTestContext(
    serverCount,
    componentConfiguration ?? {
      sensorCount: 5,
      switchCount: 5,
      buttonCount: 5
    },
    loggerToUse
  );
}
