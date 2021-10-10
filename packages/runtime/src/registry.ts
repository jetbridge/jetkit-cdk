/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/ban-types */
import { Handler } from "aws-lambda"
import isPlainObject from "is-plain-object"
import deepmerge from "deepmerge"
import * as fs from "fs"
import {
  getApiViewMetadata,
  getFunctionMetadata,
  getSubRouteMetadata,
  IApiViewClassMetadata,
  IFunctionMetadata,
  ISubRouteApiMetadata,
  MetadataTarget,
  MetadataTargetConstructor,
  setApiViewMetadata,
  setFunctionMetadata,
  setSubRouteMetadata,
} from "./metadata"
import { ApiViewMetaBase, HttpMethod } from "./types"
import { findDefiningFile } from "./function"
import { filename } from "dirname-filename-esm"

/**
 * Metadata describing any Lambda function.
 */
export interface IFunctionMetadataBase extends Partial<IRoutePropsBase> {
  /**
   * Path to the file containing the handler.
   * Normally shouldn't need to be specified and can be guessed.
   */
  entry?: string
}

const mergeMetadata = (meta1: IFunctionMetadataBase, meta2: IFunctionMetadataBase) => ({
  ...deepmerge(meta1, meta2, {
    isMergeableObject: isPlainObject,
  }),
})

/**
 * This module is responsible for attaching metadata to classes, methods, and properties to
 * assist in routing API endpoints.
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
export function ApiView(opts: ApiViewOpts) {
  // try to guess the filename where this decorator is being applied

  if (!opts.entry) {
    const guessedEndpoint = guessEntrypoint("ApiView")
    if (guessedEndpoint) opts.entry = guessedEndpoint
  }

  // return decorator
  return function <T extends MetadataTargetConstructor>(constructor: T) {
    // merge with existing metadata
    const existingMeta = getApiViewMetadata(constructor) || {}

    // save metadata
    const meta: IApiViewClassMetadata = {
      ...opts,
      apiClass: constructor,
    }

    setApiViewMetadata(constructor, mergeMetadata(existingMeta, meta))
    return constructor
  }
}

export interface ILambdaMetadata {
  entry?: string
  handler?: string
}

export interface IRoutePropsBase {
  /**
   * An optional API Gateway path to trigger this function.
   *
   * e.g. "/v1/foo/bar"
   */
  path?: string

  /**
   * Enabled {@link HttpMethod}s for route.
   * If `path` is defined, this determines which methods the path responds to.
   */
  methods?: HttpMethod[]

  /**
   * Disable default authorizer.
   *
   * Set to true for routes that do not require authorization
   * if your routes normally require it.
   */
  unauthorized?: boolean

  /**
   * Require auth scopes.
   */
  authorizationScopes?: string[]
}
export type ApiViewOpts = Omit<IFunctionMetadataBase, "methods">

export interface ISubRouteProps extends Omit<IRoutePropsBase, "path"> {
  // make path optional in @SubRoute
  path?: string
}

export interface IRouteProps extends IRoutePropsBase, ILambdaMetadata {}

interface RoutePropertyDescriptor extends PropertyDescriptor {
  value?: Function
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
    target: ApiViewMetaBase, // parent class
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
    const metadataTarget: MetadataTarget = target.constructor

    // get map
    const subroutesMap = getSubRouteMetadata(metadataTarget)

    // add to map
    subroutesMap.set(propertyKey, meta)

    // set metadata
    setSubRouteMetadata(metadataTarget, subroutesMap)
  }
}

// supported function signatures for Lambda() handlers
export type PossibleLambdaHandlers = Handler // from aws-lambda - very generic

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
  props_?: Partial<IRouteProps>
) {
  const props = props_ || ({} as Partial<IRouteProps>)

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
    // merge with existing metadata
    const existingMeta = getFunctionMetadata(wrapped) || {}

    const meta: IFunctionMetadata = {
      ...props,
      handler,
      HandlerFunc: wrapped,
    }
    if (entry) meta.entry = entry

    setFunctionMetadata(wrapped, mergeMetadata(existingMeta, meta))
    return wrapped
  }
}

/**
 * Keeps track of `entry` path to our lambda handler so you don't need to specify the file
 * path when constructing the Lambda construct.
 */
export const LambdaEs = (importMeta: ImportMeta, props?: Partial<IRouteProps>) =>
  Lambda({ entry: filename(importMeta), ...props })

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
