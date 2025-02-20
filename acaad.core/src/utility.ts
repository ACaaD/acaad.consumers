import { Effect } from 'effect';
import {
  AcaadError,
  AcaadFatalError,
  ConnectedServiceFunction,
  IConnectedServiceAdapter
} from '@acaad/abstractions';

export function executeCsAdapter<TOut>(
  serviceAdapter: IConnectedServiceAdapter,
  functionName: ConnectedServiceFunction,
  invocation: (instance: IConnectedServiceAdapter, as: AbortSignal) => Promise<TOut>
): Effect.Effect<TOut, AcaadError> {
  return Effect.tryPromise({
    try: (as) => invocation(serviceAdapter, as),
    catch: (err) => serviceAdapter.mapServiceError(functionName, err)
  });
}

export function onErrorEff(serviceAdapter: IConnectedServiceAdapter, err: AcaadError) {
  return Effect.tryPromise({
    try: (as) => serviceAdapter.onErrorAsync?.call(serviceAdapter, err, as) ?? Promise.resolve(),
    catch: (err) =>
      new AcaadFatalError(
        err,
        'An error occurred inside the error handler of the connected service. Terminating.'
      )
  });
}

export const nameof = <T>(name: keyof T) => name;
