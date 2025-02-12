import { AcaadError } from './AcaadError';

export class AcaadFatalError extends AcaadError {
  public _tag: string = 'AcaadFatalError';
}
