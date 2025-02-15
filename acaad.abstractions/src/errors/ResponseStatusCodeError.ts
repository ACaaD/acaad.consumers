import { CalloutError } from './CalloutError';
import { AcaadHost } from '../model';

export class ResponseStatusCodeError extends CalloutError {
  public static Tag: string = 'ResponseStatusCodeError';

  public override _tag: string = ResponseStatusCodeError.Tag;
  public host: AcaadHost;
  public expectedStatusCode: number;

  public constructor(host: AcaadHost, expectedStatusCode: number, error: unknown) {
    super(error);
    this.host = host;
    this.expectedStatusCode = expectedStatusCode;
  }
}
