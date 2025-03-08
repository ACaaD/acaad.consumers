import { AcaadResponseParser } from '../../../src/services/AcaadResponseParser';
import { Mock, mock } from 'ts-jest-mocker';
import {
  ICsLogger,
  AcaadCardinalityDefinition,
  AcaadOutcomeMetadata,
  AcaadResultTypeDefinition,
  AcaadOutcome,
  ComponentDescriptor,
  AcaadError,
  OutcomeNotParseableError,
  OutcomeNotJsonError
} from '@acaad/abstractions';

import { Effect, Either, Option } from 'effect';

import { setupLoggerMock } from '../mocks/utility';
import util from 'util';

interface TableTestParameters {
  outcomeRaw: string | undefined;
  cardinality: string;
  type: string;
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

  it('should fail when outcome is not populated', () => {
    const metadata: AcaadOutcomeMetadata = {
      type: 'String',
      cardinality: 'Single',
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    const outcome: AcaadOutcome = {
      outcomeRaw: undefined,
      success: true
    };

    const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);
    const effRes = Effect.runSync(eff.pipe(Effect.either));

    expect(Either.isLeft(effRes)).toBe(true);
  });

  it('should fail when type is not handled', () => {
    const metadata: AcaadOutcomeMetadata = {
      type: 'not-handled' as any,
      cardinality: 'Single' as any,
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    const outcome: AcaadOutcome = {
      outcomeRaw: 'does-not-really-matter',
      success: true
    };

    const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);
    const effRes = Effect.runSync(eff.pipe(Effect.either));

    expect(Either.isLeft(effRes)).toBe(true);
  });

  it('should fail when cardinality is not handled', () => {
    const metadata: AcaadOutcomeMetadata = {
      type: 'String',
      cardinality: 'not-handled' as any,
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    const outcome: AcaadOutcome = {
      outcomeRaw: 'does-not-really-matter',
      success: true
    };

    const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);
    const effRes = Effect.runSync(eff.pipe(Effect.either));

    expect(Either.isLeft(effRes)).toBe(true);
  });

  it('should fail if outcome is not json array', () => {
    const metadata: AcaadOutcomeMetadata = {
      type: 'String',
      cardinality: 'Multiple',
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    const outcome: AcaadOutcome = {
      outcomeRaw: `"this is not a json"`,
      success: true
    };

    const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);
    const effRes = Effect.runSync(eff.pipe(Effect.either));

    expect(Either.isLeft(effRes)).toBe(true);
  });

  it('should fail if outcome is not valid json', () => {
    const metadata: AcaadOutcomeMetadata = {
      type: 'String',
      cardinality: 'Multiple',
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    const outcomeRaw = '{ this is not a json';
    const outcome: AcaadOutcome = {
      outcomeRaw: ``,
      success: true
    };

    const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);
    const effRes = Effect.runSync(eff.pipe(Effect.either));

    if (Either.isLeft(effRes)) {
      expect(effRes.left).toBeInstanceOf(OutcomeNotJsonError);
    } else {
      throw new Error('Expected parse error.');
    }
  });

  it('should skip unparseable value when cardinality is multiple', () => {
    const metadata: AcaadOutcomeMetadata = {
      type: 'Long',
      cardinality: 'Multiple',
      onIff: Option.none(),
      unitOfMeasure: Option.none()
    };

    const outcome: AcaadOutcome = {
      outcomeRaw: `[1337, "not-parseable"]`,
      success: true
    };

    const eff = instance.parseOutcomeEff(cdMock, metadata, outcome);
    const effRes = Effect.runSync(eff);

    expect(effRes).toStrictEqual([1337]);
  });

  it.each([
    {
      outcomeRaw: 'test-string',
      cardinality: 'Single',
      type: 'String',
      expectedResult: 'test-string'
    },
    {
      outcomeRaw: '',
      cardinality: 'Single',
      type: 'String',
      expectedResult: ''
    },
    {
      outcomeRaw: 'true',
      cardinality: 'Single',
      type: 'Boolean',
      expectedResult: true
    },
    {
      outcomeRaw: 'false',
      cardinality: 'Single',
      type: 'Boolean',
      expectedResult: false
    },
    {
      outcomeRaw: 'tRUe',
      cardinality: 'Single',
      type: 'Boolean',
      expectedResult: true
    },
    {
      outcomeRaw: 'faLSE',
      cardinality: 'Single',
      type: 'Boolean',
      expectedResult: false
    },
    {
      outcomeRaw: 'test-string',
      cardinality: 'Single',
      type: 'Boolean',
      expectedError: new OutcomeNotParseableError('Boolean', 'Single', 'test-string')
    },
    {
      outcomeRaw: '1337',
      cardinality: 'Single',
      type: 'Long',
      expectedResult: 1337
    },
    {
      outcomeRaw: 'test-string',
      cardinality: 'Single',
      type: 'Long',
      expectedError: new OutcomeNotParseableError('Long', 'Single', 'test-string')
    },
    {
      outcomeRaw: '13374711',
      cardinality: 'Single',
      type: 'Decimal',
      expectedResult: 13374711
    },
    {
      outcomeRaw: '1337.4711',
      cardinality: 'Single',
      type: 'Decimal',
      expectedResult: 1337.4711
    },
    {
      outcomeRaw: 'test-string',
      cardinality: 'Single',
      type: 'Decimal',
      expectedError: new OutcomeNotParseableError('Decimal', 'Single', 'test-string')
    },
    {
      outcomeRaw: `["str1"]`,
      cardinality: 'Multiple',
      type: 'String',
      expectedResult: ['str1']
    },
    {
      outcomeRaw: `["str1", "str2"]`,
      cardinality: 'Multiple',
      type: 'String',
      expectedResult: ['str1', 'str2']
    },
    {
      outcomeRaw: `[true, false]`,
      cardinality: 'Multiple',
      type: 'Boolean',
      expectedResult: [true, false]
    },
    {
      outcomeRaw: `[1337, 4711]`,
      cardinality: 'Multiple',
      type: 'Long',
      expectedResult: [1337, 4711]
    },
    {
      outcomeRaw: `[13.37, 47.11]`,
      cardinality: 'Multiple',
      type: 'Decimal',
      expectedResult: [13.37, 47.11]
    }
  ])(
    'should handle value "$outcomeRaw" for type $type (cardinality=$cardinality)',
    (params: TableTestParameters) => {
      const { outcomeRaw, cardinality, type, expectedResult, expectedError } = params;

      const metadata: AcaadOutcomeMetadata = {
        type: type as AcaadResultTypeDefinition,
        cardinality: cardinality as AcaadCardinalityDefinition,
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

      if (Either.isLeft(effectResult)) {
        if (expectedError !== undefined) {
          expect(effectResult.left).toStrictEqual(expectedError);
        } else {
          throw new Error(
            `Expected success '${expectedResult}', but found error ${effectResult.left.error}. (${util.inspect(effectResult.left, false, null, true)})`
          );
        }
      } else {
        if (expectedResult !== undefined) {
          expect(effectResult.right).toStrictEqual(expectedResult);
        } else {
          throw new Error(
            `Expected error message '${expectedError}', but found success value ${effectResult.right}.`
          );
        }
      }
    }
  );
});
