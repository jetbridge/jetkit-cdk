/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Wrappers for getting/setting metadata on classes and class properties
 */
import { Schedule } from "@aws-cdk/aws-events"
import "reflect-metadata"
import { ApiHandler, ApiViewBase } from "./api/base"
import { FunctionOptions } from "./cdk/generator"
import { ApiViewOpts, IRoutePropsBase, PossibleLambdaHandlers } from "./registry"

/**
 * A class we can apply @ApiView to.
 */
export type MetadataTargetConstructor = typeof ApiViewBase

const JK_V2_METADATA_KEY = Symbol.for("jk:v2:metadata")

// metadata map keys
export const JK_V2_METADATA_API_VIEW_KEY = Symbol.for("jk:v2:metadata:api:view")
// sub-route method inside a class
export const JK_V2_METADATA_SUBROUTES_KEY = Symbol.for("jk:v2:metadata:subroutesuth")
// standalone function
export const JK_V2_METADATA_FUNCTION_KEY = Symbol.for("jk:v2:metadata:function")

export type ApiMetadataMap<V extends IFunctionMetadataBase> = Map<string, V>

// what types of objects can have metadata attached?
export type MetadataTarget = PossibleLambdaHandlers | MetadataTargetConstructor

/**
 * Metadata describing any Lambda function.
 */
export interface IFunctionMetadataBase extends FunctionOptions, Partial<IRoutePropsBase> {
  /**
   * Path to the file containing the handler.
   * Normally shouldn't need to be specified and can be guessed.
   */
  entry?: string

  /**
   * Schedule on which to invoke this function.
   * Triggers a CloudWatch Event.
   */
  schedule?: Schedule
}

/**
 * A Lambda function.
 * Can be invoked via API route or otherwise.
 */
export interface IFunctionMetadata extends IFunctionMetadataBase {
  HandlerFunc: PossibleLambdaHandlers
}

/**
 * APIView class.
 */
export interface IApiViewClassMetadata extends ApiViewOpts {
  apiClass: MetadataTargetConstructor
}

/**
 * Sub-route method in an APIView class.
 */
export interface ISubRouteApiMetadata extends IFunctionMetadataBase {
  propertyKey: string
  HandlerFunc?: ApiHandler
}

/// getters/setters

export const setMetadata = <T extends MetadataTarget>(cls: T, value: any) =>
  Reflect.defineMetadata(JK_V2_METADATA_KEY, value, cls)

// get/set our JKv2 metadata properties on a target
export const hasMemberMetadata = (cls: MetadataTarget, propertyKey: string | symbol): cls is MetadataTarget =>
  Reflect.hasMetadata(JK_V2_METADATA_KEY, cls, propertyKey)

export const getMemberMetadata = <V>(target: MetadataTarget, propertyKey: string | symbol): V | undefined =>
  Reflect.getMetadata(JK_V2_METADATA_KEY, target, propertyKey)

export const setMemberMetadata = (target: MetadataTarget, propertyKey: string | symbol, value: any) =>
  Reflect.defineMetadata(JK_V2_METADATA_KEY, value, target, propertyKey)

export const getMetadataKeys = (target: MetadataTarget, key: string | symbol) => Reflect.getOwnMetadataKeys(target, key)

// API view
export const getApiViewMetadata = (cls: MetadataTarget): IApiViewClassMetadata | undefined =>
  getMemberMetadata(cls, JK_V2_METADATA_API_VIEW_KEY)
export const setApiViewMetadata = (cls: MetadataTarget, value: IApiViewClassMetadata) =>
  setMemberMetadata(cls, JK_V2_METADATA_API_VIEW_KEY, value)

// sub-routes
export const getSubRouteMetadata = (target: MetadataTarget): ApiMetadataMap<ISubRouteApiMetadata> =>
  getMemberMetadata(target, JK_V2_METADATA_SUBROUTES_KEY) || new Map()
export const setSubRouteMetadata = (target: MetadataTarget, value: ApiMetadataMap<ISubRouteApiMetadata>) =>
  setMemberMetadata(target, JK_V2_METADATA_SUBROUTES_KEY, value)

// plain function
export const getFunctionMetadata = (target: PossibleLambdaHandlers): IFunctionMetadata | undefined =>
  getMemberMetadata(target, JK_V2_METADATA_FUNCTION_KEY)
export const setFunctionMetadata = (target: PossibleLambdaHandlers, value: IFunctionMetadata) =>
  setMemberMetadata(target, JK_V2_METADATA_FUNCTION_KEY, value)
