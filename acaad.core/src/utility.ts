import { Effect } from 'effect';
import { AcaadError, ConnectedServiceFunction, IConnectedServiceAdapter } from '@acaad/abstractions';
import { AcaadFatalError } from '@acaad/abstractions/src/errors/AcaadFatalError';

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
