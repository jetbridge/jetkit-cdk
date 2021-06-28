import { HttpApi, HttpMethod, PayloadFormatVersion } from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { CfnOutput, Construct } from "@aws-cdk/core"
import { FunctionOptions } from "../generator"
import { Node14Func } from "../lambda/node14func"

/**
 * @category Construct
 */
export interface ApiProps extends FunctionOptions, IEndpoint {}

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

export interface IAddRoutes extends IEndpoint {
  lambdaApiIntegration: LambdaProxyIntegration
}
export abstract class ApiViewMixin extends Construct {
  #routeOutputId = 1

  addRoutes({ methods, path = "/", httpApi, lambdaApiIntegration }: IAddRoutes) {
    methods = methods || [HttpMethod.ANY]
    // * /path -> lambda integration
    const routes = httpApi.addRoutes({
      path,
      methods,
      integration: lambdaApiIntegration,
    })

    // output the route for easily seeing at a glance what routes are generated
    const route = routes[0] // one for each method; don't care
    const routeId = `Route${this.#routeOutputId++}`
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

  handlerFunction: Node14Func
  lambdaApiIntegration: LambdaProxyIntegration

  constructor(scope: Construct, id: string, { httpApi, methods, path = "/", ...rest }: ApiProps) {
    super(scope, id)

    // lambda handler
    this.handlerFunction = new Node14Func(this, `View${id}`, rest)

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
