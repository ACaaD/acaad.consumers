import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { IStateObserver } from '../types';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { LogFunc } from '@acaad/testing';
import { getTestLogger } from '../framework/test-setup';
import { DurationInput } from 'effect/Duration';
import { Duration } from 'effect';
import { Sema } from 'async-sema';

export class ObservableSpanExporter implements SpanExporter, IStateObserver {
  private readonly log: LogFunc;

  private spanToCount: Map<string, number> = new Map<string, number>();
  private trackedSpans: Map<string, (span: ReadableSpan) => void> = new Map<string, () => {}>();
  private trackedTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.log = getTestLogger('State-Observer');
    this.log(`Creating new span exporter.`);
  }

  async waitForSignalRClient(serverCount?: number, duration?: DurationInput): Promise<void> {
    this.log('Setting up wait promise for signalR client.');
    const startMs = Date.now();
    await this.waitForSpanAsync(
      'acaad:cs:onServerConnected',
      duration ?? 1_000 * (serverCount ?? 1),
      serverCount
    );
    this.log(`SignalR client connected after ${Date.now() - startMs}ms.`);
  }

  private resolveWrapped(startMs: number, spanName: string, res: (value: ReadableSpan) => void) {
    return (span: ReadableSpan) => {
      res(span);
      this.log(`Span ${spanName} resolved after ${Date.now() - startMs}ms.`);
    };
  }

  waitForSpanAsync(spanName: string, timeout?: DurationInput, count?: number): Promise<ReadableSpan> {
    timeout ??= '200 millis';
    this.log(`Tracking span with name ${spanName}.`);

    const startWait = Date.now();

    let resolveFunc: ((value: ReadableSpan) => void) | undefined;
    let rejectFunc: (reason?: any) => void | undefined;

    const promise = new Promise<ReadableSpan>(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!resolveFunc) {
      throw new Error('An error occurred generating callback. This should _never_ happen.');
    }

    this.trackedSpans.set(spanName, this.resolveWrapped(startWait, spanName, resolveFunc));
    this.spanToCount.set(spanName, count ?? 1);

    const timeoutMs = Duration.toMillis(timeout);
    const rejectTimeout = setTimeout(
      () => rejectFunc(`Error: Timeout of ${timeoutMs}ms exceeded for span ${spanName}.`),
      timeoutMs
    );
    this.trackedTimeouts.set(spanName, rejectTimeout);

    return promise;
  }

  private sem = new Sema(1);
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const found = spans.filter((span) => this.spanToCount.has(span.name));

    if (found.length === 0) {
      resultCallback({
        code: ExportResultCode.SUCCESS
      });
      return;
    }

    const startMs = Date.now();
    this.sem
      .acquire()
      .then(() => {
        this.log(`StateObserver waited ${Date.now() - startMs}ms to access the semaphore.`);

        const toResolve: ReadableSpan[] = [];

        found.forEach((span) => {
          const entry = this.spanToCount.get(span.name)!;
          if (entry === 1) {
            toResolve.push(span);
            this.spanToCount.delete(span.name);
          } else {
            this.spanToCount.set(span.name, entry - 1);
          }
        });

        if (toResolve.length > 0) {
          this.log(`Found ${toResolve.length} promises to resolve.`);
          toResolve.forEach((span) => {
            const timeout = this.trackedTimeouts.get(span.name)!;
            clearTimeout(timeout);
            this.trackedTimeouts.delete(span.name);

            const resolveFunc = this.trackedSpans.get(span.name)!;
            resolveFunc(span);
            this.trackedSpans.delete(span.name);
          });
        }
      })
      .catch((r) => {
        console.error('Unexpected rejection waiting for semaphore.', r);
        throw new Error(
          'ObservableSpanExporter: An error occurred acquiring the semaphore. This should (?) never happen.'
        );
      })
      .finally(() => {
        this.sem.release();
        resultCallback({
          code: ExportResultCode.SUCCESS
        });
      });
  }
  shutdown(): Promise<void> {
    this.log(`Shutting down observable span exporter with ${this.trackedSpans.size} pending promises.`);
    return Promise.resolve();
  }

  public static Create(): ObservableSpanExporter {
    return new ObservableSpanExporter();
  }
}
