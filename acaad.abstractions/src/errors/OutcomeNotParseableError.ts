import { AcaadError } from './AcaadError';
import { AcaadCardinalityDefinition, AcaadResultTypeDefinition } from '../model/AcaadMetadata';

export class OutcomeNotParseableError extends AcaadError {
  _tag: string = 'OutcomeNotParseableError';

  constructor(
    expectedType: AcaadResultTypeDefinition,
    expectedCardinality: AcaadCardinalityDefinition,
    outcomeRaw: unknown
  ) {
    super(
      `Could not parse received outcome. Expected type ${expectedType} and cardinality ${expectedCardinality}, but received: '${outcomeRaw}'.`
    );
  }
}
