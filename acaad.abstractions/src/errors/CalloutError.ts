import { AcaadError } from './AcaadError';

export class CalloutError extends AcaadError {
  public _tag: string = 'CalloutError';

  public RequestError: any;
  public CaughtError: unknown;

  public constructor(requestError: any, caughtError?: unknown) {
    super(null);
    this.RequestError = requestError;
    this.CaughtError = caughtError;
  }

  public toString(): string {
    return `CalloutError: ${this.RequestError}`;
  }
}
