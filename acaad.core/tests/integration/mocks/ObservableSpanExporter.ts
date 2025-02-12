import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { IStateObserver } from '../types';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { LogFunc } from '@acaad/testing';
import { getTestLogger } from '../framework/test-setup';

export class ObservableSpanExporter implements SpanExporter, IStateObserver {
  private readonly log: LogFunc;
  private static instance: ObservableSpanExporter = new ObservableSpanExporter();

  private trackedSpans: Map<string, () => void> = new Map<string, () => {}>();
  private trackedTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.log = getTestLogger('State-Observer');
    this.log(`Creating new span exporter.`);
  }

  async waitForSignalRClient(): Promise<void> {
    this.log('Setting up wait promise for signalR client.');
    const startMs = Date.now();
    await this.waitForSpanAsync('acaad:cs:onServerConnected', 500);
    this.log(`SignalR client connected after ${Date.now() - startMs}ms.`);
  }

  private resolveWrapped(startMs: number, spanName: string, res: () => void) {
    return () => {
      res();
      this.log(`Span ${spanName} resolved after ${Date.now() - startMs}ms.`);
    };
  }

  waitForSpanAsync(spanName: string, timeoutMs: number = 200): Promise<void> {
    this.log(`Tracking span with name ${spanName}.`);

    const startWait = Date.now();

    let resolveFunc: (() => void) | undefined;
    let rejectFunc: (reason?: any) => void | undefined;

    const promise = new Promise<void>(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!resolveFunc) {
      throw new Error('An error occurred generating callback. This should _never_ happen.');
    }

    // TODO: Synchronization + Duplicate handling
    this.trackedSpans.set(spanName, this.resolveWrapped(startWait, spanName, resolveFunc));

    const rejectTimeout = setTimeout(
      () => rejectFunc(`Error: Timeout of ${timeoutMs}ms exceeded for span ${spanName}.`),
      timeoutMs
    );
    this.trackedTimeouts.set(spanName, rejectTimeout);

    return promise;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const toResolve = spans.filter((span) => this.trackedSpans.has(span.name));

    if (toResolve.length > 0) {
      this.log(`Found ${toResolve.length} promises to resolve.`);
      toResolve.forEach((span) => {
        const timeout = this.trackedTimeouts.get(span.name)!;
        clearTimeout(timeout);
        this.trackedTimeouts.delete(span.name);

        const resolveFunc = this.trackedSpans.get(span.name)!;
        resolveFunc();
        this.trackedSpans.delete(span.name);
      });
    }

    spans.forEach((span) => console.log(`${span.name} -> ${span.duration}`));

    resultCallback({
      code: ExportResultCode.SUCCESS
    });
  }
  shutdown(): Promise<void> {
    this.log(`Shutting down observable span exporter with ${this.trackedSpans.size} pending promises.`);
    return Promise.resolve();
  }

  public static Create(): ObservableSpanExporter {
    return ObservableSpanExporter.instance;
  }
}
