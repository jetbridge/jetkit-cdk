import { HttpApi, HttpMethod, PayloadFormatVersion } from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { Construct } from "@aws-cdk/core"
import { Node14Func } from "../lambda/node14func"

/**
 * @category Construct
 */
export interface ApiProps extends NodejsFunctionProps, IEndpoint {}

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
  addRoutes({ methods, path = "/", httpApi, lambdaApiIntegration }: IAddRoutes) {
    // * /path -> lambda integration
    httpApi.addRoutes({
      path,
      methods: methods || [HttpMethod.ANY],
      integration: lambdaApiIntegration,
    })
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
  handlerFunction: Node14Func
  httpApi: HttpApi
  path?: string
  methods?: HttpMethod[]

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
    this.methods = methods

    this.addRoutes({ httpApi, methods, path, lambdaApiIntegration: this.lambdaApiIntegration })
  }
}
