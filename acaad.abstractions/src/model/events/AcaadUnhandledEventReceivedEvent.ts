import { AcaadEvent, AcaadPopulatedEvent } from './AcaadEvent';
import { AcaadHost } from '../connection';

export class AcaadUnhandledEventReceivedEvent extends AcaadEvent implements AcaadPopulatedEvent {
  public static Tag: string = 'AcaadUnhandledEventReceivedEvent';

  public _tag: string = AcaadUnhandledEventReceivedEvent.Tag;

  public host: AcaadHost;
  public unhandledEvent: unknown;

  public constructor(host: AcaadHost, unhandledEvent: unknown) {
    super('internal', 'Signaling', AcaadUnhandledEventReceivedEvent.Tag);
    this.host = host;
    this.unhandledEvent = unhandledEvent;
  }
}
