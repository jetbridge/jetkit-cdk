import { CrudApiBase } from "./api/crud/base";
import { BaseModel } from "demo-repo";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { findDefiningFile } from "./util/function";

export interface Registerable {
  registryId: symbol;
}

export function findCrudApiInRegistry(
  api: CrudApiConstructor
): ICrudApiRegistry | undefined {
  return resourceRegistry.crudApis.find((reg) => api == reg.apiClass);
}

export interface ICrudApiRegistry extends NodejsFunctionProps {
  route: string;
  entry?: string;
  model: typeof BaseModel;
  apiClass: CrudApiConstructor;
}

interface IResourceRegistry {
  crudApis: ICrudApiRegistry[];
}

export const resourceRegistry: IResourceRegistry = {
  crudApis: [],
};

interface CrudApiConstructor {
  new (...args: unknown[]): CrudApiBase;
}

/**
 * Decorator factory to register CRUD API view classes.
 *
 */
export function RegisterCrudApi(opts: Omit<ICrudApiRegistry, "apiClass">) {
  if (!opts.entry) {
    // guess entrypoint file from caller
    const guessedEntry = findDefiningFile("RegisterCrudApi");
    if (!guessedEntry)
      throw new Error(
        `Could not determine entry point, please define it in "entry"`
      );
    opts.entry = guessedEntry;
  }

  // return decorator
  return function <T extends CrudApiConstructor>(constructor: T) {
    // save the api config in registry
    resourceRegistry.crudApis.push({
      ...opts,
      apiClass: constructor,
    });
    return constructor;
  };
}
