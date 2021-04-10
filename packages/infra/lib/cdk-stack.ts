import { CorsHttpMethod, HttpApi } from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import { CfnOutput, Construct, Duration } from "@aws-cdk/core";
import {
  // CrudApi,
  // findCrudApiInRegistry,
  JetKitCdkApp,
  // WrappableConstructor,
  getJKMetadata,
  CrudApiConstruct,
  hasJKMetadata,
} from "@jetkit/cdk";
import { stackResources } from "demo-backend";
// import { TopicCrudApi } from "../../backend/build/api/topic";

export interface ICrudApisProps {
  httpApi: HttpApi;
  app: JetKitCdkApp;
}

// const apis = [TopicCrudApi as WrappableConstructor];

export class CrudApis extends Construct {
  constructor(scope: cdk.Construct, id: string, props: ICrudApisProps) {
    super(scope, id);

    const { httpApi, app } = props;

    stackResources.forEach((crudApi) => {
      if (!hasJKMetadata(crudApi)) {
        throw new Error(
          `Did not find metadata on ${crudApi}, did you decorate it with @CrudApi?`
        );
      }

      const meta = getJKMetadata(crudApi);
      console.log(meta);

      const name = meta.apiClass.name;

      new CrudApiConstruct(this, name, {
        httpApi,
        path: meta.route,
        ...meta,
      });

      // iterate over properties and see if any have metadata
      // ...
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
