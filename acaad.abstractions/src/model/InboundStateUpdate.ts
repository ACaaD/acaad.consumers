import { AcaadOutcome } from './AcaadOutcome';
import { AcaadMetadata } from './AcaadMetadata';

export interface InboundStateUpdate {
  originalOutcome: AcaadOutcome;

  determinedTargetState: unknown;

  metadata: AcaadMetadata;
}
