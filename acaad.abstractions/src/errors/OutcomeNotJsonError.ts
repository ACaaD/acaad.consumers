import { OutcomeNotParseableError } from './OutcomeNotParseableError';
import { AcaadCardinalityDefinition, AcaadResultTypeDefinition } from '../model';

export class OutcomeNotJsonError extends OutcomeNotParseableError {
  _tag: string = 'OutcomeNotJsonError';

  public errorDetails: unknown | undefined;

  constructor(
    expectedType: AcaadResultTypeDefinition,
    expectedCardinality: AcaadCardinalityDefinition,
    outcomeRaw: unknown,
    errorDetails?: unknown
  ) {
    super(
      expectedType,
      expectedCardinality,
      outcomeRaw,
      `Could not parse outcome ${outcomeRaw}. It does not seem to be valid json.`
    );

    this.errorDetails = errorDetails;
  }
}
