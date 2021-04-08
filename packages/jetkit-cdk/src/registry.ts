/* eslint-disable @typescript-eslint/no-explicit-any */
import { CrudApiBase } from "./api/crud/base";
import { BaseModel } from "demo-repo";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { findDefiningFile } from "./util/function";
import { JetKitCdkApp } from "./app";
import { ApiBase } from "./api/base";

// export function getMeta()

export function findApiInRegistry(
  app: JetKitCdkApp,
  api: ApiConstructor
): IApiRegistry | undefined {
  return app.resourceRegistry.apis.find((reg) => api == reg.apiClass);
}
export function findCrudApiInRegistry(
  app: JetKitCdkApp,
  api: CrudApiConstructor
): ICrudApiRegistry | undefined {
  return app.resourceRegistry.crudApis.find((reg) => api == reg.apiClass);
}

export interface IApiRegistry extends NodejsFunctionProps {
  route: string;
  entry?: string;
  apiClass: ApiConstructor;
  // routeMap?: Map<string, PropertyDescriptor>;
}

export interface ICrudApiRegistry extends IApiRegistry {
  model: typeof BaseModel;
  apiClass: CrudApiConstructor;
}

export interface IResourceRegistry {
  crudApis: ICrudApiRegistry[];
  apis: IApiRegistry[];
}

export interface ApiConstructor {
  new (...args: any[]): ApiBase;
}
export interface CrudApiConstructor {
  new (...args: any[]): CrudApiBase;
}
export interface CrudApiMetaConstructor {
  new (...args: any[]): CrudApiBase;
  meta: ICrudApiRegistry;
}

interface ICrudApiWithMeta {
  meta: ICrudApiRegistry;
}

/**
 * Define CRUD API view class.
 */
export function CrudApi(opts: Omit<ICrudApiRegistry, "apiClass">) {
  if (!opts.entry) {
    // guess entrypoint file from caller
    const guessedEntry = findDefiningFile("CrudApi");
    if (!guessedEntry)
      throw new Error(
        `Could not determine entry point, please define it in "entry"`
      );
    opts.entry = guessedEntry;
  }

  // return decorator
  return function <T extends CrudApiConstructor>(constructor: T) {
    // save the api config in registry
    // app.resourceRegistry.crudApis.push({
    //   ...opts,
    //   apiClass: constructor,
    //   // routeMap: new Map(),
    // });
    return class extends constructor {
      static meta: ICrudApiRegistry = {
        ...opts,
        apiClass: constructor,
      };
    };
  };
}

/**
 * Add a route to an Api view.
 */
export function Route(path: string) {
  return function (
    target: ApiBase,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    console.log("map", target.routeMethodMap);
    console.log("target", target);
    console.log("propertyKey", propertyKey);
    console.log("descriptor", descriptor);

    target.routeMethodMap = target.routeMethodMap || new Map();

    // XXX: we could save propertyKey (property name) or descriptor.value (func)
    // not sure which is better
    target.routeMethodMap.set(path, descriptor.value);
    // target.routeMethodMap.set(path, propertyKey);
  };
}
