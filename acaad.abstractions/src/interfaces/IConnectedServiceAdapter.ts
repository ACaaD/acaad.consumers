import {
  ComponentDescriptor,
  AcaadUnitOfMeasure,
  Component,
  AcaadHost,
  AcaadServerMetadata,
  ComponentCommandOutcomeEvent,
  AcaadUnhandledEventReceivedEvent
} from '../model';

import { Option } from 'effect/Option';

export type ChangeType = 'action' | 'query';

export type OutboundStateChangeCallback = (
  host: AcaadHost,
  componentDescriptor: ComponentDescriptor,
  type: ChangeType,
  value: Option<unknown>
) => Promise<boolean>;

export interface IConnectedServiceAdapter {
  getComponentDescriptorByComponent(component: Component): ComponentDescriptor;

  transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown;

  createServerModelAsync(server: AcaadServerMetadata): Promise<void>;

  onServerConnectedAsync(server: AcaadHost): Promise<void>;

  onServerDisconnectedAsync(server: AcaadHost): Promise<void>;

  createComponentModelAsync(component: Component): Promise<void>;

  registerStateChangeCallbackAsync(cb: OutboundStateChangeCallback, as: AbortSignal): Promise<void>;

  updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void>;

  getConnectedServersAsync(as: AbortSignal): Promise<AcaadHost[]>;

  getAllowedConcurrency(): number;

  onUnhandledEventAsync?(unhandledEvent: AcaadUnhandledEventReceivedEvent, as: AbortSignal): Promise<void>;

  onUnmappedComponentEventAsync?(event: ComponentCommandOutcomeEvent, as: AbortSignal): Promise<void>;
}

export default IConnectedServiceAdapter;
