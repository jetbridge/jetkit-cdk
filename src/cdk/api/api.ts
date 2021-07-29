import {
  AddRoutesOptions,
  HttpApi,
  HttpMethod,
  HttpNoneAuthorizer,
  PayloadFormatVersion,
} from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { CfnOutput, Construct } from "@aws-cdk/core"
import { IRoutePropsBase } from "../../registry"
import { FunctionOptions } from "../generator"
import { Node14FuncProps as JetKitLambdaFunctionProps, Node14Func as JetKitLambdaFunction } from "../lambda/node14func"

export { JetKitLambdaFunction, JetKitLambdaFunctionProps }

/**
 * Definition of a lambda API integration.
 * @category Construct
 */
export interface ApiConfig extends FunctionOptions, IEndpoint {}

export interface ApiProps extends ApiConfig {
  handlerFunction: JetKitLambdaFunction
}

export interface IEndpoint extends Partial<IRoutePropsBase> {
  /**
   * API Gateway HTTP API
   */
  httpApi: HttpApi
}

let routeOutputId = 1

export interface IAddRoutes extends IEndpoint {
  lambdaApiIntegration: LambdaProxyIntegration
  unauthorized?: boolean
}

export abstract class ApiViewMixin extends Construct {
  addRoutes({ methods, path = "/", httpApi, lambdaApiIntegration, unauthorized }: IAddRoutes) {
    methods = methods || [HttpMethod.ANY]

    if (!methods.length) return

    const routeOptions: AddRoutesOptions = {
      path,
      methods,
      integration: lambdaApiIntegration,
      // disable authorization?
      ...(unauthorized ? { authorizer: new HttpNoneAuthorizer() } : {}),
    }
    const routes = httpApi.addRoutes(routeOptions)

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

  constructor(
    scope: Construct,
    id: string,
    { httpApi, methods, path = "/", handlerFunction, unauthenticated }: ApiProps
  ) {
    super(scope, id)

    // lambda handler
    this.handlerFunction = handlerFunction

    // lambda API integration
    this.lambdaApiIntegration = new LambdaProxyIntegration({
      handler: this.handlerFunction,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    })

    // construct route params
    const routes: IAddRoutes = { httpApi, path, lambdaApiIntegration: this.lambdaApiIntegration, unauthorized, ...rest }
    if (methods) routes.methods = methods
    this.httpApi = httpApi
    this.methods = methods
    this.path = path
    const routes: IAddRoutes = { httpApi, path, lambdaApiIntegration: this.lambdaApiIntegration, unauthenticated }
    if (methods) {
      this.methods = methods
      routes.methods = methods
    }
    this.addRoutes(routes)
  }
}
