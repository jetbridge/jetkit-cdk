import { findDefiningFile } from "./util/function";
import { ApiBase, RequestHandler } from "./api/base";
import "reflect-metadata";
import {
  IApiMetadata,
  ICrudApiMetadata,
  ISubRouteApiMetadata,
  MetadataTarget,
  setJKMemberMetadata,
  setJKMetadata,
} from "./metadata";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

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

interface RoutePropertyDescriptor extends PropertyDescriptor {
  value?: RequestHandler;
}

export interface ISubRouteProps {
  methods?: HttpMethod[];
}
/**
 * Add a route to an Api view.
 * Use this on class member functions.
 *
 */
export function SubRoute(path: string, props?: ISubRouteProps) {
  return function (
    target: ApiBase, // parent class
    propertyKey: string,
    descriptor: RoutePropertyDescriptor
  ) {
    // get method
    const method = descriptor.value;
    if (!method)
      throw new Error(
        `Empty handler found on ${propertyKey} of ${target} using @SubRoute`
      );

    // method handler metadata
    const meta: ISubRouteApiMetadata = {
      path,
      requestHandlerFunc: method,
      propertyKey,
      ...props,
    };

    // associate property in the target class metadata with our metadata
    const metadataTarget: MetadataTarget = target.constructor;
    setJKMemberMetadata(metadataTarget, propertyKey, meta);
  };
}

interface IRouteProps {
  path: string;
}
export function Route({ path }: IRouteProps) {
  return (wrapped: RequestHandler) => {
    const meta: IApiMetadata = {
      path,
      requestHandlerFunc: wrapped,
    };

    setJKMetadata(wrapped, meta);
    return wrapped;
  };
}
