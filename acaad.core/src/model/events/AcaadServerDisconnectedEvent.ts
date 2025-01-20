import { AcaadEvent, AcaadPopulatedEvent } from './AcaadEvent';
import { AcaadHost } from '../connection/AcaadHost';

export class AcaadServerDisconnectedEvent extends AcaadEvent implements AcaadPopulatedEvent {
  public static Tag: string = 'AcaadServerDisconnectedEvent';

  public _tag: string = AcaadServerDisconnectedEvent.Tag;
  public host: AcaadHost;

  public constructor(host: AcaadHost) {
    super('internal', 'Signaling', AcaadServerDisconnectedEvent.Tag);
    this.host = host;
  }
}
