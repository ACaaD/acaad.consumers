import {
  IResponseParser,
  AcaadError,
  AcaadOutcome,
  AcaadOutcomeMetadata,
  ComponentDescriptor,
  ICsLogger,
  OutcomeNotParseableError
} from '@acaad/abstractions';
import { Effect, Option, Stream } from 'effect';
import { isUndefined } from 'effect/Predicate';

import { inject, injectable } from 'tsyringe';
import { DependencyInjectionTokens } from '../model/DependencyInjectionTokens';

@injectable()
export class AcaadResponseParser implements IResponseParser {
  private _logger: ICsLogger;

  constructor(@inject(DependencyInjectionTokens.Logger) logger: ICsLogger) {
    this._logger = logger;
  }

  parseSingleValue(metadata: AcaadOutcomeMetadata, value: unknown): Effect.Effect<unknown, AcaadError> {
    switch (metadata.type) {
      case 'String':
        return Effect.succeed(value);
      case 'Boolean':
        return Effect.succeed(Boolean(value).valueOf());
      case 'Long':
        const maybeLong = Number(value);
        if (isNaN(maybeLong)) {
          this._logger.logWarning(
            `Expected value of type ${metadata.type}, but the received value '${value}' is violating the contract.`
          );
          return Effect.fail(new OutcomeNotParseableError(metadata.type, metadata.cardinality, value));
        }
        return Effect.succeed(Math.round(maybeLong));
      case 'Decimal':
        const maybeDecimal = Number(value);
        if (isNaN(maybeDecimal)) {
          this._logger.logWarning(
            `Expected value of type ${metadata.type}, but the received value '${value}' is violating the contract.`
          );
          return Effect.fail(new OutcomeNotParseableError(metadata.type, metadata.cardinality, value));
        }
        return Effect.succeed(maybeDecimal);
    }
  }

  parseOutcomeEff(
    componentDescriptor: ComponentDescriptor,
    metadata: AcaadOutcomeMetadata,
    outcome: AcaadOutcome
  ): Effect.Effect<unknown, AcaadError> {
    if (isUndefined(outcome.outcomeRaw)) {
      this._logger.logWarning(
        `Unexpected empty outcome (raw) value for component ${componentDescriptor.toIdentifier()}. Ignoring event. This should never happen.`
      );

      return Effect.fail(
        new OutcomeNotParseableError(metadata.type, metadata.cardinality, outcome.outcomeRaw)
      );
    }

    if (metadata.cardinality === 'Single') {
      return this.parseSingleValue(metadata, outcome.outcomeRaw);
    } else if (metadata.cardinality === 'Multiple') {
      const fromJsonArray = JSON.parse(outcome.outcomeRaw);
      if (!Array.isArray(fromJsonArray)) {
        this._logger.logWarning(
          `Cardinality is populated as 'Multiple' but event is not a json array for component ${componentDescriptor.toIdentifier()}. Ignoring event.`
        );

        return Effect.fail(
          new OutcomeNotParseableError(metadata.type, metadata.cardinality, outcome.outcomeRaw)
        );
      }

      const res = Stream.fromIterable(fromJsonArray).pipe(
        Stream.mapEffect((val) => this.parseSingleValue(metadata, val).pipe(Effect.option)),
        Stream.filter(Option.isSome),
        Stream.map(Option.some)
      );

      return Stream.runCollect(res);
    } else {
      this._logger.logError(
        undefined,
        undefined,
        `Unknown cardinality ${metadata.cardinality}. Cannot process component ${componentDescriptor.toIdentifier()}.`
      );

      return Effect.fail(
        new OutcomeNotParseableError(metadata.type, metadata.cardinality, outcome.outcomeRaw)
      );
    }
  }
}
