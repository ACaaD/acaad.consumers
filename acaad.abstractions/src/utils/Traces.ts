export class TraceInfo {
  traceId: string;
  spanId: string;

  constructor(traceParent: string) {
    const splitByDash = traceParent.split('-');

    if (splitByDash.length !== 4) {
      throw new Error("Invalid 'traceparent' format.");
    }

    this.traceId = splitByDash[1];
    this.spanId = splitByDash[2];
  }
}
