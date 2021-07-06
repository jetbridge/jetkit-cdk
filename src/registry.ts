import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { Schedule } from "@aws-cdk/aws-events"
import { ScheduledHandler } from "aws-lambda"
import fs from "fs"
import { ApiViewBase, ApiHandler } from "./api/base"
import { FunctionOptions } from "./cdk/generator"
import {
  getSubRouteMetadata,
  IApiViewClassMetadata,
  IFunctionMetadata,
  IFunctionMetadataBase,
  ISubRouteApiMetadata,
  MetadataTarget,
  MetadataTargetConstructor,
  setApiViewMetadata,
  setFunctionMetadata,
  setSubRouteMetadata,
} from "./metadata"
import { findDefiningFile } from "./util/function"

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in the automated generation of cloud resources from application code.
 *
 * @module
 */

/**
 * Define API view class routing properties.
 *
 * Saves metadata on the class for generation of CDK resources.
 *
 * @category Metadata Decorator
 */
export function ApiView(opts: IFunctionMetadataBase) {
  // try to guess the filename where this decorator is being applied

  if (!opts.entry) {
    const guessedEndpoint = guessEntrypoint("ApiView")
    if (guessedEndpoint) opts.entry = guessedEndpoint
  }

  // return decorator
  return function <T extends MetadataTargetConstructor>(constructor: T) {
    // save metadata
    const meta: IApiViewClassMetadata = {
      ...opts,
      apiClass: constructor,
    }

    setApiViewMetadata(constructor, meta)
    return constructor
  }
}

interface RoutePropertyDescriptor extends PropertyDescriptor {
  value?: ApiHandler
}

export interface ISubRouteProps {
  path: string
  methods?: HttpMethod[]
}

export interface IRouteProps extends FunctionOptions {
  path: string
  methods?: HttpMethod[]
}

export interface IScheduledProps extends FunctionOptions {
  schedule: Schedule
}

/**
 * Add a route to an Api view.
 * Use this on class methods that are inside an @ApiView class.
 *
 * Saves metadata on the method for generation of CDK resources.
 *
 * @category Metadata Decorator
 */
export function SubRoute({ path, methods }: ISubRouteProps) {
  return function (
    target: ApiViewBase, // parent class
    propertyKey: string,
    descriptor: RoutePropertyDescriptor
  ) {
    // get method
    const method = descriptor.value
    if (!method) throw new Error(`Empty handler found on ${propertyKey} of ${target} using @SubRoute`)

    // method handler metadata
    const meta: ISubRouteApiMetadata = {
      HandlerFunc: method,
      propertyKey,
      path,
    }
    if (methods) meta.methods = methods

    // update target class subroutes metadata map with our metadata

    // assuming the function signature is correct - no way to check at runtime
    const metadataTarget: MetadataTarget = target.constructor as ApiHandler

    // get map
    const subroutesMap = getSubRouteMetadata(metadataTarget)

    // add to map
    subroutesMap.set(propertyKey, meta)

    // set metadata
    setSubRouteMetadata(metadataTarget, subroutesMap)
  }
}

// supported function signatures for Lambda() handlers
export type PossibleLambdaHandlers = ApiHandler | ScheduledHandler

/**
 * Defines a Lambda function.
 *
 * Saves metadata on the function for generation of CDK resources.
 *
 * N.B. in order for the Lambda entry handler to locate your function it must be named and exported
 * or you can manually provide the name of the exported handler in `props.handler`.
 * @param props configure optional API route and any other lambda function properties including memory allocation and environment variables.
 * @returns
 *
 * @category Metadata Decorator
 */
export function Lambda<HandlerT extends PossibleLambdaHandlers = PossibleLambdaHandlers>(
  props: IRouteProps | IScheduledProps
) {
  return (wrapped: HandlerT) => {
    // here we figure out the entrypoint path and function handler name:

    // super terrible hack to guess where decorator was applied
    // FIXME: figure out how to find file containing call site of decorator
    const entry = props.entry || guessEntrypoint(null)
    const handler = props.handler || wrapped.name
    if (!handler) {
      // we need to know the name of the function and it needs to be exported
      // in order to define the lambda entrypoint handler.
      // if the function was defined anonymously (e.g. `const foo = async(event) => {...}`)
      // then the name will be blank.
      // it would be better to get the _exported_ name of the function that is being
      // decorated but I've no clue how to get that.
      throw new Error(
        `This function is unnamed. Please define it using "async function foo() {...}" or explicitly pass the exported handler name to Lambda().\nFunction:\n${wrapped}\n\nThis is necessary to define the entrypoint handler name for the lambda function configuration.`
      )
    }

    const meta: IFunctionMetadata = {
      ...props,
      handler,
      HandlerFunc: wrapped,
    }
    if (entry) meta.entry = entry

    setFunctionMetadata(wrapped, meta)
    return wrapped
  }
}

/**
 * Search call stack for a function with a given name.
 * Not reliable for decorators.
 *
 * @param functionName callsite function name
 * @returns path where function callsite was found
 *
 */
function guessEntrypoint(functionName: string | null): string | undefined {
  // guess entrypoint file from caller
  const guessedEntry = findDefiningFile(functionName)

  if (!guessedEntry || !fs.existsSync(guessedEntry)) {
    // throw new Error(
    //   `Could not determine entry point where ${functionName} was called, please define path to entrypoint file in "entry"`
    // )
    return undefined
  }

  return guessedEntry
}
