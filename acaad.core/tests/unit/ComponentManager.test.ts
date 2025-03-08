import { ComponentManager } from '../../src';
import { IConnectedServiceAdapter, ICsLogger, AcaadOutcomeMetadata } from '@acaad/abstractions';
import { mock, Mock } from 'ts-jest-mocker';
import { ConnectionManager } from '../../src/ConnectionManager';
import { QueueWrapper } from '../../src/QueueWrapper';
import { IMetadataModel } from '../../src/MetadataModel';
import { Layer, Option } from 'effect';
import { Resource } from 'effect/Resource';
import { Configuration } from '@effect/opentelemetry/src/NodeSdk';

describe('ComponentManager', () => {
  let serviceAdapterMock: Mock<IConnectedServiceAdapter>;
  let connectionManagerMock: Mock<ConnectionManager>;
  let loggerMock: Mock<ICsLogger>;
  let queueWrapperMock: Mock<QueueWrapper>;
  let metadataModelMock: Mock<IMetadataModel>;
  let opelTelLayerMock: () => Layer.Layer<Resource<Configuration>>;

  let instance: ComponentManager;

  beforeAll(() => {
    serviceAdapterMock = mock<IConnectedServiceAdapter>();
    connectionManagerMock = mock<ConnectionManager>();
    loggerMock = mock<ICsLogger>();
    queueWrapperMock = mock<QueueWrapper>();
    metadataModelMock = mock<IMetadataModel>();
    opelTelLayerMock = () => mock<Layer.Layer<Resource<Configuration>>>();

    instance = new ComponentManager(
      serviceAdapterMock,
      connectionManagerMock,
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
