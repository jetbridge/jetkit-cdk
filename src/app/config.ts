/**
 * Make it easy to load a well-defined configuration and make it available easily.
 *
 * @module
 */

import { CorsPreflightOptions } from "@aws-cdk/aws-apigatewayv2"
import { BundlingOptions } from "@aws-cdk/aws-lambda-nodejs"
import { default as convict } from "convict"

export { CorsPreflightOptions, CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2"

export interface IConfigGeneric {
  api?: {
    corsPreflight?: CorsPreflightOptions
  }
  bundle?: BundlingOptions
}

export type IConfig<T = Record<string | number | symbol, unknown>> = IConfigGeneric & T

const defaults: IConfig = {
  api: {
    corsPreflight: {},
  },
}
// const schema = convict(defaults)

export class Config<T> {
  constructor(private readonly config: Partial<IConfig<T>>) {
    // merge with defaults
  }
}
