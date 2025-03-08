import { ComponentManager } from '../../src';
import {
  IConnectedServiceAdapter,
  ICsLogger,
  AcaadOutcomeMetadata,
  IResponseParser,
  AcaadPopulatedEvent
} from '@acaad/abstractions';
import { mock, Mock } from 'ts-jest-mocker';
import { ConnectionManager } from '../../src/ConnectionManager';
import { QueueWrapper } from '../../src/QueueWrapper';
import { IMetadataModel } from '../../src/MetadataModel';
import { Effect, Layer, Option, Queue } from 'effect';
import { Resource } from 'effect/Resource';
import { Configuration } from '@effect/opentelemetry/src/NodeSdk';
import { setupConnectedServiceMockInstance } from '../integration/mocks/MockServiceAdapter';

describe('ComponentManager', () => {
  let serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  let connectionManagerMock: Mock<ConnectionManager>;
  let responseParserMock: Mock<IResponseParser>;
  let loggerMock: Mock<ICsLogger>;
  let queueWrapperMock: Mock<QueueWrapper>;
  let metadataModelMock: Mock<IMetadataModel>;
  let opelTelLayerMock: () => Layer.Layer<Resource<Configuration>>;

  let instance: ComponentManager;

  beforeAll(() => {
    serviceAdapterMock = mock<IConnectedServiceAdapter>();
    setupConnectedServiceMockInstance(serviceAdapterMock);

    connectionManagerMock = mock<ConnectionManager>();
    responseParserMock = mock<IResponseParser>();

    loggerMock = mock<ICsLogger>();
    queueWrapperMock = mock<QueueWrapper>();
    queueWrapperMock.getQueue.mockImplementation(() =>
      Effect.runSync(Queue.unbounded<AcaadPopulatedEvent>())
    );

    metadataModelMock = mock<IMetadataModel>();
    opelTelLayerMock = () => mock<Layer.Layer<Resource<Configuration>>>();

    instance = new ComponentManager(
      serviceAdapterMock,
      connectionManagerMock,
      responseParserMock,
      loggerMock,
      queueWrapperMock,
      metadataModelMock,
      opelTelLayerMock
    );
  });

  describe('parseSingleValue', () => {
    const baseMetadata: AcaadOutcomeMetadata = {
      cardinality: 'Single',
      type: 'String',
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    it('should handle string successfully', () => {});
  });
});
