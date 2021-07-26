import { HttpApi, HttpMethod, PayloadFormatVersion } from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { CfnOutput, Construct } from "@aws-cdk/core"
import { FunctionOptions } from "../generator"
import { Node14FuncProps as JetKitLambdaFunctionProps, Node14Func as JetKitLambdaFunction } from "../lambda/node14func"

export { JetKitLambdaFunction, JetKitLambdaFunctionProps }

/**
 * @category Construct
 */
export interface ApiConfig extends FunctionOptions, IEndpoint {}

export interface ApiProps extends ApiConfig {
  handlerFunction: JetKitLambdaFunction
}

export interface IEndpoint {
  /**
   * API Gateway HTTP API
   */
  httpApi: HttpApi

  /**
   * Route
   */
  path?: string

  /**
   * Enabled {@link HttpMethod}s for route
   */
  methods?: HttpMethod[]
}

let routeOutputId = 1

export interface IAddRoutes extends IEndpoint {
  lambdaApiIntegration: LambdaProxyIntegration
}
export abstract class ApiViewMixin extends Construct {
  addRoutes({ methods, path = "/", httpApi, lambdaApiIntegration }: IAddRoutes) {
    methods = methods || [HttpMethod.ANY]

    if (!methods.length) return

    // * /path -> lambda integration
    const routes = httpApi.addRoutes({
      path,
      methods,
      integration: lambdaApiIntegration,
    })

    // output the route for easily seeing at a glance what routes are generated
    const route = routes[0] // one for each method; don't care
    const routeId = `Route${routeOutputId++}`
    new CfnOutput(this, routeId, { value: `${methods?.join(",")} ${route.path}` || "*" })
  }
}

/**
 * API endpoint CDK construct.
 *
 * Defines a route and Lambda function handler on an HttpApi.
 *
 * @category Construct
 */
export class ApiView extends ApiViewMixin implements IEndpoint {
  httpApi: HttpApi
  path?: string
  methods?: HttpMethod[]

  handlerFunction: JetKitLambdaFunction
  lambdaApiIntegration: LambdaProxyIntegration

  constructor(scope: Construct, id: string, { httpApi, methods, path = "/", handlerFunction }: ApiProps) {
    super(scope, id)

    // lambda handler
    this.handlerFunction = handlerFunction

    // lambda API integration
    this.lambdaApiIntegration = new LambdaProxyIntegration({
      handler: this.handlerFunction,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    })

    this.httpApi = httpApi
    this.path = path
    const routes: IAddRoutes = { httpApi, path, lambdaApiIntegration: this.lambdaApiIntegration }
    if (methods) {
      this.methods = methods
      routes.methods = methods
    }
    this.addRoutes(routes)
  }
}
