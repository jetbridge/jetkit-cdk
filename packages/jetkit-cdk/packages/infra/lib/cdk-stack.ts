import { CorsHttpMethod, HttpApi } from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import { CfnOutput, Construct, Duration } from "@aws-cdk/core";
import { JetKitCdkApp, ResourceGeneratorConstruct } from "@jetkit/cdk";
import { stackResources } from "demo-backend";

export interface ICrudApisProps {
  httpApi: HttpApi;
  app: JetKitCdkApp;
}

export class CrudApis extends Construct {
  constructor(scope: cdk.Construct, id: string, props: ICrudApisProps) {
    super(scope, id);

    const { httpApi } = props;

    new ResourceGeneratorConstruct(this, "Generator", {
      resources: stackResources,
      httpApi,
    });

    new CfnOutput(this, `BaseUrl`, {
      value: httpApi.url || "Unknown",
    });
  }
}

export class InfraStack extends cdk.Stack {
  constructor(scope: JetKitCdkApp, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, "Api", {
      corsPreflight: {
        allowHeaders: ["Authorization"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.HEAD,
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.POST,
        ],
        allowOrigins: ["*"],
        maxAge: Duration.days(10),
      },
    });

    new CrudApis(this, "CrudApis", { app: scope, httpApi });
  }
}
