import { CalloutError } from './CalloutError';
import { AcaadHost } from '../model';

export class ResponseStatusCodeError extends CalloutError {
  public static Tag: string = 'ResponseStatusCodeError';

  public override _tag: string = ResponseStatusCodeError.Tag;
  public host: AcaadHost;

  public expectedStatusCode: number;
  public actualStatusCode: number;

  public constructor(host: AcaadHost, expectedStatusCode: number, actualStatusCode: number, error: unknown) {
    super(error);
    this.host = host;
    this.expectedStatusCode = expectedStatusCode;
    this.actualStatusCode = actualStatusCode;
  }
}
