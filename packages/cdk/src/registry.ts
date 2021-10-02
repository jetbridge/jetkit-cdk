import { Schedule } from "@aws-cdk/aws-events"
import fs from "fs"
import { ApiHandler } from "./api/base"
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
import { ApiViewMetaBase, Lambda as BaseLambda, PossibleLambdaHandlers } from "@jetkit/cdk-metadata"

/**
 * Define API view class routing properties.
 *
 * Saves metadata on the class for generation of CDK resources.
 *
 * @category Metadata Decorator
 */
export class ApiViewCdk extends ApiView {}
export type ApiViewOpts = Omit<IFunctionMetadataBase, "methods">

interface RoutePropertyDescriptor extends PropertyDescriptor {
  value?: ApiHandler
}

export interface ISubRouteProps extends Omit<RoutePropsBase, "path"> {
  // make path optional in @SubRoute
  path?: string
}

export interface IRouteProps extends FunctionOptions, IRoutePropsBase {}

export interface IScheduledProps extends FunctionOptions {
  schedule: Schedule
}
export function Lambda<HandlerT extends PossibleLambdaHandlers = PossibleLambdaHandlers>(
  props: Partial<IRouteProps> | IScheduledProps
) {
  return BaseLambda<HandlerT>(props)
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
