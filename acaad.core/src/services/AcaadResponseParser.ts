import {
  AcaadError,
  AcaadOutcome,
  AcaadOutcomeMetadata,
  ComponentDescriptor,
  ICsLogger,
  IResponseParser,
  OutcomeNotJsonError,
  OutcomeNotParseableError
} from '@acaad/abstractions';
import { Chunk, Effect, Option, Stream } from 'effect';
import { isUndefined } from 'effect/Predicate';

import { inject, injectable } from 'tsyringe';
import { DependencyInjectionTokens } from '../model/DependencyInjectionTokens';

// noinspection JSPotentiallyInvalidUsageOfClassThis
@injectable()
export class AcaadResponseParser implements IResponseParser {
  private _logger: ICsLogger;

  constructor(@inject(DependencyInjectionTokens.Logger) logger: ICsLogger) {
    this._logger = logger;
  }

  trueRegex = /^true$/i;
  falseRegex = /^false$/i;

  parseSingleValue(metadata: AcaadOutcomeMetadata, value: unknown): Effect.Effect<unknown, AcaadError> {
    switch (metadata.type) {
      case 'String':
        return Effect.succeed(value);
      case 'Boolean':
        // @ts-ignore
        const val = value.toString();
        if (this.trueRegex.test(val)) {
          return Effect.succeed(true);
        } else if (this.falseRegex.test(val)) {
          return Effect.succeed(false);
        }

        return Effect.fail(new OutcomeNotParseableError(metadata.type, metadata.cardinality, value));
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
      default:
        return Effect.fail(
          new AcaadError(
            undefined,
            `Unknown type ${metadata.type}. Is there a version mismatch between server and client?`
          )
        );
    }
  }

  tryParseJsonEff(metadata: AcaadOutcomeMetadata, outcomeRaw: string): Effect.Effect<unknown, AcaadError> {
    return Effect.try({
      try: () => JSON.parse(outcomeRaw),
      catch: (err) => new OutcomeNotJsonError(metadata.type, metadata.cardinality, outcomeRaw, err)
    });
  }

  handleSingleEff(
    componentDescriptor: ComponentDescriptor,
    metadata: AcaadOutcomeMetadata,
    outcome: AcaadOutcome
  ): Effect.Effect<unknown, AcaadError> {
    return Effect.gen(this, function* () {
      const jsonParsed = yield* this.tryParseJsonEff(metadata, outcome.outcomeRaw!);

      return yield* this.parseSingleValue(metadata, jsonParsed);
    });
  }

  handleMultipleEff(
    componentDescriptor: ComponentDescriptor,
    metadata: AcaadOutcomeMetadata,
    outcome: AcaadOutcome
  ): Effect.Effect<unknown, AcaadError> {
    return Effect.gen(this, function* () {
      const fromJsonArray = yield* this.tryParseJsonEff(metadata, outcome.outcomeRaw!);
      if (!Array.isArray(fromJsonArray)) {
        this._logger.logWarning(
          `Cardinality for component ${componentDescriptor.toIdentifier()} is populated as 'Multiple' but event is not a json array. Ignoring event.`
        );

        return yield* Effect.fail<AcaadError>(
          new OutcomeNotParseableError(metadata.type, metadata.cardinality, outcome.outcomeRaw)
        );
      }

      const resStream: Stream.Stream<unknown> = Stream.fromIterable(fromJsonArray).pipe(
        Stream.mapEffect((val) => this.parseSingleValue(metadata, val).pipe(Effect.option)),
        Stream.filter(Option.isSome),
        Stream.map(Option.getOrUndefined)
      );

      return yield* Stream.runCollect(resStream).pipe(Effect.andThen((chunk) => Chunk.toArray(chunk)));
    });
  }

  handleUnknownCardinalityEff(
    componentDescriptor: ComponentDescriptor,
    metadata: AcaadOutcomeMetadata,
    outcome: AcaadOutcome
  ): Effect.Effect<void, AcaadError> {
    return Effect.gen(this, function* () {
      this._logger.logError(
        undefined,
        undefined,
        `Unknown cardinality ${metadata.cardinality}. Cannot process component ${componentDescriptor.toIdentifier()}.`
      );

      yield* Effect.fail<AcaadError>(
        new OutcomeNotParseableError(metadata.type, metadata.cardinality, outcome.outcomeRaw)
      );
    });
  }

  parseOutcomeEff(
    componentDescriptor: ComponentDescriptor,
    metadata: AcaadOutcomeMetadata,
    outcome: AcaadOutcome
  ): Effect.Effect<unknown, AcaadError> {
    return Effect.gen(this, function* () {
      if (isUndefined(outcome.outcomeRaw)) {
        this._logger.logWarning(
          `Unexpected empty outcome (raw) value for component ${componentDescriptor.toIdentifier()}. Ignoring event. This should never happen.`
        );

        return yield* Effect.fail<AcaadError>(
          new OutcomeNotParseableError(metadata.type, metadata.cardinality, outcome.outcomeRaw)
        );
      }

      if (metadata.cardinality === 'Single') {
        return yield* this.handleSingleEff(componentDescriptor, metadata, outcome);
      } else if (metadata.cardinality === 'Multiple') {
        return yield* this.handleMultipleEff(componentDescriptor, metadata, outcome);
      } else {
        return yield* this.handleUnknownCardinalityEff(componentDescriptor, metadata, outcome);
      }
    });
  }
}
