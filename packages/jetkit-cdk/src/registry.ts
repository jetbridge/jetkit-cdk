import { findDefiningFile } from "./util/function";
import { ApiBase, RequestHandler } from "./api/base";
import "reflect-metadata";
import {
  IApiMetadata,
  ICrudApiMetadata,
  setJKMemberMetadata,
  setJKMetadata,
} from "./metadata";

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in the automated generation of cloud resources from application code.
 */

// probably not needed types
export type WrappableConstructor = typeof ApiBase;
export interface WrappedConstructor {
  new (...args: unknown[]): ApiBase;
}

/**
 * Define CRUD API view class.
 */
export function CrudApi(opts: Omit<ICrudApiMetadata, "apiClass">) {
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
    // save metadata
    const meta: ICrudApiMetadata = {
      ...opts,
      apiClass: constructor,
    };
    setJKMetadata(constructor, meta);
    return constructor;
  };
}

/**
 * Add a route to an Api view.
 * Use this on class member functions.
 *
 */
export function SubRoute(route: string) {
  return function (
    target: ApiBase, // parent class
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    console.log("target", target);
    console.log("propertyKey", propertyKey);
    console.log("descriptor", descriptor);

    const meta: ICrudApiMetadata = {
      route,
      apiClass: target.constructor.prototype,
    };

    console.log("Proto set", target.constructor);

    // associate property in the target class metadata with our metadata
    setJKMemberMetadata(target.constructor, propertyKey, meta);
  };
}

interface IRouteProps {
  route: string;
}
export function Route({ route }: IRouteProps) {
  return (wrapped: RequestHandler) => {
    const meta: IApiMetadata = {
      route,
      requestHandlerFunc: wrapped,
    };

    setJKMetadata(wrapped, meta);
  };
}
