import {
  HttpApi,
  HttpMethod,
  PayloadFormatVersion,
} from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import { Runtime } from "@aws-cdk/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "@aws-cdk/aws-lambda-nodejs";
import { Construct } from "@aws-cdk/core";

export interface ApiProps extends NodejsFunctionProps {
  // top-level API
  httpApi: HttpApi;

  // route
  path?: string;

  methods?: HttpMethod[];
}

export class Api extends Construct {
  handlerFunction: NodejsFunction;
  lambdaApiIntegration: LambdaProxyIntegration;
  httpApi: HttpApi;
  path: string;
  methods?: HttpMethod[];

  constructor(
    scope: Construct,
    id: string,
    { httpApi, methods, path = "/", ...rest }: ApiProps
  ) {
    super(scope, id);

    // lambda handler
    this.handlerFunction = new NodejsFunction(this, `ApiHandler${id}`, {
      runtime: Runtime.NODEJS_14_X,
      ...rest,

      // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: true,
    });

    // lambda API integration
    this.lambdaApiIntegration = new LambdaProxyIntegration({
      handler: this.handlerFunction,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    });

    this.httpApi = httpApi;
    this.path = path;
    this.methods = methods;

    this.addRoutes();
  }

  addRoutes() {
    // * /path -> lambda integration
    this.httpApi.addRoutes({
      path: this.path,
      methods: this.methods || [HttpMethod.ANY],
      integration: this.lambdaApiIntegration,
    });
  }
}
