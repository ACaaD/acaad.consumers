import { AcaadResponseParser } from '../../../src/services/AcaadResponseParser';
import { Mock, mock } from 'ts-jest-mocker';
import {
  ICsLogger,
  AcaadCardinalityDefinition,
  AcaadOutcomeMetadata,
  AcaadResultTypeDefinition,
  AcaadOutcome,
  ComponentDescriptor
} from '@acaad/abstractions';

import { Effect, Either, Option } from 'effect';
import { AcaadError } from '@acaad/abstractions/src';
import { setupLoggerMock } from '../mocks/utility';

interface TableTestParameters {
  outcomeRaw: string | undefined;
  cardinality: AcaadCardinalityDefinition;
  type: AcaadResultTypeDefinition;
  expectedResult?: unknown;
  expectedError?: AcaadError;
}

describe('AcaadResponseParser', () => {
  let instance: AcaadResponseParser;

  let loggerMock: Mock<ICsLogger>;
  let cdMock: Mock<ComponentDescriptor>;

  beforeAll(() => {
    loggerMock = mock<ICsLogger>();
    setupLoggerMock(loggerMock);

    cdMock = mock<ComponentDescriptor>();
    cdMock.toIdentifier.mockReturnValue('mock-component');

    instance = new AcaadResponseParser(loggerMock);
  });

  it.each([
    {
      outcomeRaw: 'test-string',
      cardinality: 'Single' as AcaadCardinalityDefinition,
      type: 'String' as AcaadResultTypeDefinition,
      expectedResult: 'test-string'
    },
    {
      outcomeRaw: 'test-string',
      cardinality: 'Single' as AcaadCardinalityDefinition,
      type: 'Long' as AcaadResultTypeDefinition,
      expectedResult: 'test-string'
    }
  ])(
    'should parse $type with cardinality $cardinality (expected=$expectedResult)',
    (params: TableTestParameters) => {
      const { cardinality, type, expectedResult, expectedError } = params;

      const outcomeRaw = 'this-is-a-test';

      const metadata: AcaadOutcomeMetadata = {
        type,
        cardinality,
        onIff: Option.none(),
        unitOfMeasure: Option.none()
      };

      const outcome: AcaadOutcome = {
        outcomeRaw: outcomeRaw,
        success: true
      };

      const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);

      const expected = outcomeRaw;

      const effectResult = Effect.runSync(eff.pipe(Effect.either));

      if (expectedResult) {
        expect(Either.isRight(effectResult)).toBe(true);
      } else {
        expect(Either.isLeft(effectResult)).toBe(true);
      }
    }
  );
});
