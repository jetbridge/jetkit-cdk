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
import { enumerateMethodMetadata, MetadataTarget } from "../../metadata";
import { WrappableConstructor } from "../../registry";

export interface CrudApiProps extends NodejsFunctionProps {
  // top-level API
  httpApi: HttpApi;

  // route
  path?: string;

  apiClass: WrappableConstructor;

  resource: MetadataTarget;
}

export class CrudApi extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { httpApi, path = "/", apiClass, resource, ...rest }: CrudApiProps
  ) {
    super(scope, id);

    // lambda handler
    const func = new NodejsFunction(this, "CrudHandler", {
      runtime: Runtime.NODEJS_14_X,
      ...rest,

      // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: true,
    });

    // lambda API integration
    const lambdaApiIntegration = new LambdaProxyIntegration({
      handler: func,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    });

    // generate custom registered routes
    // iterate over properties and see if any have metadata
    enumerateMethodMetadata(resource).forEach((meta) => {
      const { requestHandlerFunc, path, methods, ...subRouteRest } = meta;

      httpApi.addRoutes({
        path,
        methods: methods,
        integration: lambdaApiIntegration,
      });
    });

    // route to integration
    httpApi.addRoutes({
      path,
      methods: [HttpMethod.ANY],
      integration: lambdaApiIntegration,
    });
  }
}
