import { Effect, Queue } from 'effect';
import { AcaadPopulatedEvent } from '@acaad/abstractions';
import { injectable } from 'tsyringe';

@injectable()
export class QueueWrapper {
  private readonly _queue;

  constructor() {
    // TODO: Define drop-strategy and set bound for capacity
    this._queue = Effect.runSync(Queue.unbounded<AcaadPopulatedEvent>());
  }

  public getQueue(): Queue.Queue<AcaadPopulatedEvent> {
    return this._queue;
  }
}
