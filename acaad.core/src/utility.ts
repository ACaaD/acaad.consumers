import { Effect } from 'effect';
import { AcaadError, ConnectedServiceFunction, IConnectedServiceAdapter } from '@acaad/abstractions';

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
