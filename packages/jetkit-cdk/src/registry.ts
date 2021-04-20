import { findDefiningFile } from "./util/function";
import { ApiBase, RequestHandler } from "./api/base";
import {
  getSubRouteMetadata,
  IApiMetadata,
  ICrudApiMetadata,
  ISubRouteApiMetadata,
  MetadataTarget,
  setCrudApiMetadata,
  setRouteMetadata,
  setSubRouteMetadata,
} from "./metadata";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in the automated generation of cloud resources from application code.
 */

// probably not needed types
export type WrappableConstructor = typeof ApiBase;
export interface WrappedConstructor {
  new (...args: unknown[]): ApiBase;
}

function guessEntrypoint(functionName: string): string {
  // guess entrypoint file from caller
  let guessedEntry;
  try {
    guessedEntry = findDefiningFile(functionName);
  } catch (ex) {
    console.error(ex);
  }

  if (!guessedEntry)
    throw new Error(
      `Could not determine entry point where ${functionName} was called, please define path to entrypoint file in "entry"`
    );
  return guessedEntry;
}

/**
 * Define CRUD API view class.
 */
export function CrudApi(opts: Omit<ICrudApiMetadata, "apiClass">) {
  if (!opts.entry) opts.entry = guessEntrypoint("CrudApi");

  // return decorator
  return function <T extends WrappableConstructor>(constructor: T) {
    // save metadata
    const meta: ICrudApiMetadata = {
      ...opts,
      apiClass: constructor,
    };

    setCrudApiMetadata(constructor, meta);
    return constructor;
  };
}

interface RoutePropertyDescriptor extends PropertyDescriptor {
  value?: RequestHandler;
}

export interface ISubRouteProps extends NodejsFunctionProps {
  methods?: HttpMethod[];
}
/**
 * Add a route to an Api view.
 * Use this on class methods that are inside a @CrudApi class.
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
      entry: props?.entry || guessEntrypoint("Object.<anonymous>.__decorate"), // really lame but we don't see method names in decorator call sites idk why
      ...props,
    };

    // update target class subroutes metadata map with our metadata

    // assuming the function signature is correct - no way to check at runtime
    const metadataTarget: MetadataTarget = target.constructor as RequestHandler;

    // get map
    const subroutesMap = getSubRouteMetadata(metadataTarget);

    // add to map
    subroutesMap.set(propertyKey, meta);

    // set metadata
    setSubRouteMetadata(metadataTarget, subroutesMap);
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

    setRouteMetadata(wrapped, meta);
    return wrapped;
  };
}
