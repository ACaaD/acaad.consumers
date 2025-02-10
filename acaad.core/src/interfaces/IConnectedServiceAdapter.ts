import { ComponentDescriptor } from '../model/ComponentDescriptor';
import { AcaadComponentMetadata } from '../model/AcaadComponentManager';
import { AcaadUnitOfMeasure } from '../model/AcaadUnitOfMeasure';
import { Component } from '../model/Component';
import { AcaadHost } from '../model/connection/AcaadHost';

import { AcaadError } from '../errors/AcaadError';
import { Effect } from 'effect';
import { Option } from 'effect/Option';
import { AcaadHostMapping, AcaadServerMetadata } from '../model/open-api/OpenApiDefinition';
import { AcaadUnhandledEventReceivedEvent } from '../model/events/AcaadUnhandledEventReceivedEvent';
import { ComponentCommandOutcomeEvent } from '../model/events/ComponentCommandOutcomeEvent';

export type ChangeType = 'action' | 'query';

export type OutboundStateChangeCallback = (
  component: Component,
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
