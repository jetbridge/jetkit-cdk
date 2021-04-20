import { findDefiningFile } from "./util/function";
import { ApiBase, RequestHandler } from "./api/base";
import {
  getSubRouteMetadata,
  ICrudApiMetadata,
  IFunctionMetadata,
  ISubRouteApiMetadata,
  MetadataTarget,
  setCrudApiMetadata,
  setRouteMetadata,
  setSubRouteMetadata,
} from "./metadata";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import fs from "fs";

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in the automated generation of cloud resources from application code.
 */

// probably not needed types
export type WrappableConstructor = typeof ApiBase;
export interface WrappedConstructor {
  new (...args: unknown[]): ApiBase;
}

function guessEntrypoint(functionName: string | null): string {
  // guess entrypoint file from caller
  let guessedEntry;
  try {
    guessedEntry = findDefiningFile(functionName);
  } catch (ex) {
    console.error(ex);
  }

  if (!guessedEntry || !fs.existsSync(guessedEntry))
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

export interface IRouteProps extends NodejsFunctionProps {
  path: string;
  methods?: HttpMethod[];
}

/**
 * Add a route to an Api view.
 * Use this on class methods that are inside a @CrudApi class.
 *
 */
export function SubRoute({ path, methods }: IRouteProps) {
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
      requestHandlerFunc: method,
      propertyKey,
      methods,
      path,
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

export function Route(props: IRouteProps) {
  return (wrapped: RequestHandler) => {
    // super terrible hack to guess where decorator was applied
    // FIXME: figure out how to find file containing call site of decorator
    const entry = props.entry || guessEntrypoint(null);

    const meta: IFunctionMetadata = {
      ...props,
      entry,
      requestHandlerFunc: wrapped,
    };

    setRouteMetadata(wrapped, meta);
    return wrapped;
  };
}
