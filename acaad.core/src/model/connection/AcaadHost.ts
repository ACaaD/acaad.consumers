import { AcaadAuthentication } from '../auth/AcaadAuthentication';

export class AcaadHost {
  public friendlyName: string;
  public host: string;
  public port: number;
  public signalrPort: number;

  public authentication: AcaadAuthentication | undefined;

  public protocol: string = 'http';

  private _restBase: string | undefined = undefined;
  private _signalrBase: string | undefined = undefined;

  public restBase(): string {
    return (this._restBase ??= `${this.protocol}://${this.host}:${this.port}`);
  }

  public signalrBase(): string {
    return (this._signalrBase ??= `${this.protocol}://${this.host}:${this.signalrPort}`);
  }

  public equals(other: AcaadHost): boolean {
    return this.host === other.host && this.port === other.port && this.signalrPort === other.signalrPort;
  }

  public append(relative: string): string {
    if (relative.startsWith('/')) {
      return `${this.restBase()}${relative}`;
    }

    return `${this.restBase()}/${relative}`;
  }

  public appendSignalR(relative: string): string {
    if (relative.startsWith('/')) {
      return `${this.signalrBase()}${relative}`;
    }

    return `${this.signalrBase()}/${relative}`;
  }

  // TODO: Reorder parameters (auth last)
  public constructor(
    friendlyName: string,
    host: string,
    port: number,
    authentication: AcaadAuthentication | undefined,
    signalrPort: number | undefined
  ) {
    this.friendlyName = friendlyName;
    this.host = host;
    this.port = port;
    this.authentication = authentication;

    if (signalrPort) {
      this.signalrPort = signalrPort;
    } else {
      this.signalrPort = port;
    }
  }
}
