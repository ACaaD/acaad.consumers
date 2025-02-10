import { OperationObject, OperationObjectSchema } from './OperationObject';
import { Schema } from 'effect';

export const PathItemObjectSchema = Schema.Struct({
  get: Schema.UndefinedOr(OperationObjectSchema),
  post: Schema.UndefinedOr(OperationObjectSchema)
});

export class PathItemObject {
  public path: string;

  public get?: OperationObject;
  public post?: OperationObject;

  constructor(path: string, get?: OperationObject, post?: OperationObject) {
    this.path = path;
    this.get = get;
    this.post = post;
  }

  public operations(): OperationObject[] {
    return [this.get, this.post].filter((op) => !!op);
  }

  public static fromSchema(
    path: string,
    schema: Schema.Schema.Type<typeof PathItemObjectSchema>
  ): PathItemObject {
    return new PathItemObject(
      path,
      schema.get ? OperationObject.fromSchema(schema.get, path, 'get') : undefined,
      schema.post ? OperationObject.fromSchema(schema.post, path, 'post') : undefined
    );
  }
}
