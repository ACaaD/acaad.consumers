import { CalloutError } from './CalloutError';
import { AcaadHost } from '../model/connection/AcaadHost';

export class AcaadServerUnreachableError extends CalloutError {
  public static Tag: string = 'AcaadServerUnreachableError';

  public override _tag: string = AcaadServerUnreachableError.Tag;
  public host: AcaadHost;
  public constructor(host: AcaadHost, error: unknown) {
    super(error);
    this.host = host;
  }
}
