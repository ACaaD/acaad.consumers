import { AcaadError } from './AcaadError';
import { AcaadCardinalityDefinition, AcaadResultTypeDefinition } from '../model';

export class OutcomeNotParseableError extends AcaadError {
  _tag: string = 'OutcomeNotParseableError';

  constructor(
    expectedType: AcaadResultTypeDefinition,
    expectedCardinality: AcaadCardinalityDefinition,
    outcomeRaw: unknown,
    message?: string
  ) {
    super(
      message ??
        `Could not parse received outcome. Expected type ${expectedType} and cardinality ${expectedCardinality}, but received: '${outcomeRaw}'.`
    );
  }
}
