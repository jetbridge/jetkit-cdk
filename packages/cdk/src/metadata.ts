/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Wrappers for getting/setting metadata on classes and class properties
 */
import { Schedule } from "@aws-cdk/aws-events"
import {
  ApiHandler,
  IRoutePropsBase,
  MetadataTargetConstructor,
  PossibleLambdaHandlers,
  IFunctionMetadata as IFunctionMetadataBase,
} from "@jetkit/cdk-runtime"
import "reflect-metadata"
import { FunctionOptions } from "./cdk/generator"
import { ApiViewOpts } from "./registry"

/**
 * Metadata describing any Lambda function.
 */
export interface LambdaFunctionMetadata extends FunctionOptions, Partial<IRoutePropsBase> {
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
export interface FunctionMetadata extends LambdaFunctionMetadata, Omit<IFunctionMetadataBase, "handler"> {
  HandlerFunc: PossibleLambdaHandlers
}

/**
 * APIView class.
 */
export interface ApiViewClassMetadata extends ApiViewOpts, LambdaFunctionMetadata {
  apiClass: MetadataTargetConstructor
}

/**
 * Sub-route method in an APIView class.
 */
export interface SubRouteApiMetadata extends LambdaFunctionMetadata {
  propertyKey: string
  HandlerFunc?: ApiHandler
}
