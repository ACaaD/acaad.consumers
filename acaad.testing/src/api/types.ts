export interface IAcaadServer {
  startAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
  port: number;
}
