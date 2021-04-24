import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import fs from "fs";
import { ApiView, RequestHandler } from "./api/base";
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
import { findDefiningFile } from "./util/function";

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in the automated generation of cloud resources from application code.
 */

// probably not needed types
export type WrappableConstructor = typeof ApiView;
export interface WrappedConstructor {
  new (...args: unknown[]): ApiView;
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
    target: ApiView, // parent class
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
    // here we figure out the entrypoint path and function handler name:

    // super terrible hack to guess where decorator was applied
    // FIXME: figure out how to find file containing call site of decorator
    const entry = props.entry || guessEntrypoint(null);
    const handler = props.handler || wrapped.name;
    if (!handler) {
      // we need to know the name of the function and it needs to be exported
      // in order to define the lambda entrypoint handler.
      // if the function was defined anonymously (e.g. `const foo = async(event) => {...}`)
      // then the name will be blank.
      // it would be better to get the _exported_ name of the function that is being
      // decorated but I've no clue how to get that.
      throw new Error(
        `This function is unnamed. Please define it using "async function foo() {...}" or explicitly pass the exported handler name to Route().\nFunction:\n${wrapped}\n\nThis is necessary to define the entrypoint handler name for the lambda function configuration.`
      );
    }

    const meta: IFunctionMetadata = {
      ...props,
      entry,
      handler,
      requestHandlerFunc: wrapped,
    };

    setRouteMetadata(wrapped, meta);
    return wrapped;
  };
}
