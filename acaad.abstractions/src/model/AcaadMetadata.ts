import { AcaadComponentMetadata } from './AcaadComponentMetadata';
import { Effect, Schema } from 'effect';
import { Option } from 'effect';
import { isNullOrUndefined } from '../utils/Checks';

const AcaadComponentMetadataSchema = Schema.Struct({
  type: Schema.String,
  name: Schema.String
});

export const AcaadResultTypeSchema = Schema.Literal('String', 'Boolean', 'Long', 'Decimal');

export type AcaadResultTypeDefinition = typeof AcaadResultTypeSchema.Type;

export const AcaadCardinalitySchema = Schema.Union(Schema.Literal('Single'), Schema.Literal('Multiple'));

export type AcaadCardinalityDefinition = typeof AcaadCardinalitySchema.Type;

export const AcaadUnitOfMeasureSchema = Schema.String;

export const AcaadMetadataSchema = Schema.Struct({
  component: AcaadComponentMetadataSchema,

  actionable: Schema.UndefinedOr(Schema.Boolean),
  queryable: Schema.UndefinedOr(Schema.Boolean),
  idempotent: Schema.UndefinedOr(Schema.Boolean),
  forValue: Schema.UndefinedOr(Schema.Unknown),

  onIff: Schema.UndefinedOr(Schema.Unknown),

  // onIff: Schema.Any.pipe(Schema.validate(val => {
  //   return Effect.succeed(val);
  // })),

  type: AcaadResultTypeSchema.pipe(
    Schema.optional,
    Schema.withDefaults({
      constructor: () => 'String' as AcaadResultTypeDefinition,
      decoding: () => 'String' as AcaadResultTypeDefinition
    })
  ),
  cardinality: AcaadCardinalitySchema.pipe(
    Schema.optional,
    Schema.withDefaults({
      constructor: () => 'Single' as AcaadCardinalityDefinition,
      decoding: () => 'Single' as AcaadCardinalityDefinition
    })
  ),
  unitOfMeasure: AcaadUnitOfMeasureSchema.pipe(Schema.optional)
});

export class AcaadMetadata {
  public path: string;
  public method: string;

  public component: AcaadComponentMetadata;
  public actionable?: boolean;
  public queryable?: boolean;
  public idempotent?: boolean;
  public forValue: Option.Option<unknown>;

  public constructor(
    path: string,
    method: string,
    component: AcaadComponentMetadata,
    idempotent?: boolean,
    actionable?: boolean,
    queryable?: boolean,
    forValue?: unknown
  ) {
    this.path = path;
    this.method = method;

    this.component = component;
    this.idempotent = idempotent ?? false;
    this.actionable = actionable ?? false;
    this.queryable = queryable ?? false;
    this.forValue = isNullOrUndefined(forValue) ? Option.none<unknown>() : Option.some(forValue);
  }

  public static fromSchema(
    path: string,
    method: string,
    schema: Schema.Schema.Type<typeof AcaadMetadataSchema>
  ): AcaadMetadata {
    return new AcaadMetadata(
      path,
      method,
      schema.component,
      schema.idempotent,
      schema.actionable,
      schema.queryable,
      schema.forValue
    );
  }

  public with(): AcaadMetadata {
    return this;
  }
}
