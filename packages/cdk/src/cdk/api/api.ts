import { HttpApi, HttpMethod, HttpNoneAuthorizer, PayloadFormatVersion } from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { CfnOutput, Construct } from "@aws-cdk/core"
import { IRoutePropsBase } from "@jetkit/cdk-runtime"
import { FunctionOptions } from "../generator"
import { Node14Func as JetKitLambdaFunction, Node14FuncProps as JetKitLambdaFunctionProps } from "../lambda/node14func"

export { JetKitLambdaFunction, JetKitLambdaFunctionProps }

export interface IEndpoint extends IRoutePropsBase {
  /**
   * API Gateway HTTP API
   */
  httpApi: HttpApi
}

/**
 * @category Construct
 */
interface ApiConfig extends FunctionOptions, IEndpoint {}

export interface ApiProps extends ApiConfig {
  handlerFunction: JetKitLambdaFunction
}

let routeOutputId = 1

interface IAddRoutes extends IEndpoint {
  lambdaApiIntegration: LambdaProxyIntegration
}
export abstract class ApiViewMixin extends Construct {
  addRoutes({ methods, path = "/", httpApi, lambdaApiIntegration, unauthorized, ...rest }: IAddRoutes) {
    methods = methods || [HttpMethod.ANY]

    if (!methods.length) return

    // * /path -> lambda integration
    const routes = httpApi.addRoutes({
      path,
      methods,
      integration: lambdaApiIntegration,
      ...rest,
      ...(unauthorized ? { authorizer: new HttpNoneAuthorizer() } : {}),
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
export class ApiFunction extends ApiViewMixin implements IEndpoint {
  httpApi: HttpApi
  path: string
  methods?: HttpMethod[]

  handlerFunction: JetKitLambdaFunction
  lambdaApiIntegration: LambdaProxyIntegration

  constructor(scope: Construct, id: string, { httpApi, path = "/", methods, handlerFunction, ...rest }: ApiProps) {
    super(scope, id)

    // lambda handler
    this.handlerFunction = handlerFunction

    // lambda API integration
    this.lambdaApiIntegration = new LambdaProxyIntegration({
      handler: this.handlerFunction,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    })

    // construct route params
    const routes: IAddRoutes = { httpApi, path, lambdaApiIntegration: this.lambdaApiIntegration, ...rest }
    if (methods) routes.methods = methods
    this.methods = methods

    this.httpApi = httpApi
    this.path = path

    // create routes
    this.addRoutes(routes)
  }
}
