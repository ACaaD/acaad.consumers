import { ComponentDescriptor } from '@acaad/abstractions';

export interface IAcaadServer {
  startAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
  port: number;
}

export interface IPortConfiguration {
  api: number;
  adminApi: number;
  signalr: number;
}

export interface IComponentConfiguration {
  sensorCount?: number;
  buttonCount?: number;
  switchCount?: number;
  componentPrefix?: string;
  suppressComponentEndpoints?: boolean;
}

export interface IMockedComponentModel {
  sensors?: ComponentDescriptor[];
  buttons?: ComponentDescriptor[];
  switches?: ComponentDescriptor[];
}
