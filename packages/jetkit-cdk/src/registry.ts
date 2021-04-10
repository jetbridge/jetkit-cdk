/* eslint-disable @typescript-eslint/no-explicit-any */
import { CrudApiBase } from "./api/crud/base";
import { BaseModel } from "demo-repo";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { findDefiningFile } from "./util/function";
import { JetKitCdkApp } from "./app";
import { ApiBase } from "./api/base";
import "reflect-metadata";

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in the automated generation of cloud resources from application code.
 */

export const JK_V2_METADATA_KEY = "jk:v2:metadata";

export interface IApiRegistry extends NodejsFunctionProps {
  route: string;
  entry?: string;
  apiClass: WrappableConstructor;
  // routeMap?: Map<string, PropertyDescriptor>;
}

export interface ICrudApiRegistry extends IApiRegistry {
  model: typeof BaseModel;
  apiClass: WrappableConstructor;
}

export interface IResourceRegistry {
  crudApis: ICrudApiRegistry[];
  apis: IApiRegistry[];
}

/**
 * A class that can be annotated with metadata.
 */
export interface WrappableConstructor {
  new (...args: any[]): ApiBase;
}
export interface WrappedConstructor {
  new (...args: any[]): ApiBase;
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
  return function <T extends WrappableConstructor>(constructor: T) {
    const meta: ICrudApiRegistry = {
      ...opts,
      apiClass: constructor,
    };
    const AnnotatedClass = class extends constructor {};
    Reflect.defineMetadata(JK_V2_METADATA_KEY, meta, AnnotatedClass);
    return AnnotatedClass;
  };
}

export const getJKMetadata = <T extends WrappedConstructor>(
  cls: T
): ICrudApiRegistry => Reflect.getMetadata(JK_V2_METADATA_KEY, cls);

export const getJKMemberMetadata = <T extends WrappedConstructor>(
  cls: T,
  propertyKey: string | symbol
): ICrudApiRegistry | undefined =>
  Reflect.getMetadata(JK_V2_METADATA_KEY, cls, propertyKey);

export const hasJKMetadata = (
  cls: WrappableConstructor
): cls is WrappedConstructor => {
  console.log(cls);

  return Reflect.hasMetadata(JK_V2_METADATA_KEY, cls);
};
/**
 * Add a route to an Api view.
 */
export function Route(route: string) {
  return function (
    target: WrappableConstructor, // class?
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // console.log("map", target.routeMethodMap);
    console.log("target", target);
    console.log("propertyKey", propertyKey);
    console.log("descriptor", descriptor);

    const meta: IApiRegistry = {
      route,
      apiClass: target,
    };

    // associate property in the target class metadata with our metadata
    Reflect.defineMetadata(
      JK_V2_METADATA_KEY,
      meta,
      target.prototype,
      propertyKey
    );
    // target.routeMethodMap = target.routeMethodMap || new Map();

    // XXX: we could save propertyKey (property name) or descriptor.value (func)
    // not sure which is better
    // target.routeMethodMap.set(path, descriptor.value);
    // target.routeMethodMap.set(path, propertyKey);
  };
}
