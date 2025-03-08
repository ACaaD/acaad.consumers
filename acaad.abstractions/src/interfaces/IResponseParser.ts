import { Effect } from 'effect';
import { AcaadOutcome, AcaadOutcomeMetadata, ComponentDescriptor } from '../model';
import { AcaadError } from '../errors';

export interface IResponseParser {
  parseOutcomeEff(
    componentDescriptor: ComponentDescriptor,
    metadata: AcaadOutcomeMetadata,
    outcome: AcaadOutcome
  ): Effect.Effect<unknown, AcaadError>;

  parseSingleValue(metadata: AcaadOutcomeMetadata, value: unknown): Effect.Effect<unknown, AcaadError>;
}
