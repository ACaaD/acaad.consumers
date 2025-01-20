import { AcaadEvent, AcaadPopulatedEvent } from './AcaadEvent';
import { AcaadHost } from '../connection/AcaadHost';

export class AcaadServerConnectedEvent extends AcaadEvent implements AcaadPopulatedEvent {
  public static Tag: string = 'AcaadServerConnectedEvent';

  public _tag: string = AcaadServerConnectedEvent.Tag;
  public host: AcaadHost;
  public constructor(host: AcaadHost) {
    super('internal', 'Signaling', AcaadServerConnectedEvent.Tag);
    this.host = host;
  }
}
