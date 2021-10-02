import { Schedule } from "@aws-cdk/aws-events"
import { FunctionOptions } from "./cdk/generator"
import {
  Lambda as BaseLambda,
  PossibleLambdaHandlers,
  IFunctionMetadataBase,
  IRoutePropsBase,
  ApiView,
} from "@jetkit/cdk-metadata"
import { LambdaFunctionMetadata } from "./metadata"

/**
 * Define API view class routing properties.
 *
 * Saves metadata on the class for generation of CDK resources.
 *
 * @category Metadata Decorator
 */
// export class ApiViewCdk extends ApiView {}
export type ApiViewOpts = Omit<IFunctionMetadataBase, "methods">

export interface IRouteProps extends FunctionOptions, IRoutePropsBase {}

export interface IScheduledProps extends FunctionOptions {
  schedule: Schedule
}

export function LambdaCdk<HandlerT extends PossibleLambdaHandlers = PossibleLambdaHandlers>(
  props: Partial<IRouteProps> | IScheduledProps
) {
  return BaseLambda<HandlerT>(props)
}

export function ApiViewCdk(props: ApiViewOpts & LambdaFunctionMetadata) {
  return ApiView(props)
}
