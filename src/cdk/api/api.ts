import { HttpApi, HttpMethod, PayloadFormatVersion } from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { Construct } from "@aws-cdk/core"
import { Node14Func } from "../lambda/node14func"

export interface ApiProps extends NodejsFunctionProps {
  /**
   * API Gateway HTTP API
   */
  httpApi: HttpApi

  /**
   * Route
   */
  path?: string

  methods?: HttpMethod[]
}

/**
 * API endpoint CDK construct.
 *
 * Defines a route and Lambda function handler on an HttpApi.
 */
export class ApiView extends Construct {
  handlerFunction: NodejsFunction
  lambdaApiIntegration: LambdaProxyIntegration
  httpApi: HttpApi
  path: string
  methods?: HttpMethod[]

  constructor(scope: Construct, id: string, { httpApi, methods, path = "/", ...rest }: ApiProps) {
    super(scope, id)

    // lambda handler
    this.handlerFunction = new Node14Func(this, "Api${id}", rest)

    // lambda API integration
    this.lambdaApiIntegration = new LambdaProxyIntegration({
      handler: this.handlerFunction,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    })

    this.httpApi = httpApi
    this.path = path
    this.methods = methods

    this.addRoutes()
  }

  private addRoutes() {
    // * /path -> lambda integration
    this.httpApi.addRoutes({
      path: this.path,
      methods: this.methods || [HttpMethod.ANY],
      integration: this.lambdaApiIntegration,
    })
  }
}
