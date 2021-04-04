import { CorsHttpMethod, HttpApi } from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import { CfnOutput, Construct, Duration } from "@aws-cdk/core";
import {
  CrudApi,
  CrudApiBase,
  findCrudApiInRegistry,
  resourceRegistry,
} from "@jetkit/cdk";
import { stackResources } from "demo-backend";

export interface ICrudApisProps {
  httpApi: HttpApi;
}

export class CrudApis extends Construct {
  constructor(scope: cdk.Construct, id: string, props: ICrudApisProps) {
    super(scope, id);

    const { httpApi } = props;

    console.log("resource registrry", resourceRegistry);
    console.log("stack reseources", stackResources);

    stackResources.forEach((crudApi) => {
      const registryEntry = findCrudApiInRegistry(crudApi);
      if (!registryEntry) {
        throw new Error(
          `Did not find ${crudApi} in route registry, did you define it with @RegisterCrudApi?`
        );
      }

      console.log("reg entry", registryEntry);
      const name = registryEntry.apiClass.name;
      console.log("name", name);

      const api = new CrudApi(this, name, {
        httpApi,
        path: registryEntry.route,
        ...registryEntry,
      });
    });

    new CfnOutput(this, `BaseUrl`, {
      value: httpApi.url || "Unknown",
    });
  }
}

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
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

    new CrudApis(this, "CrudApis", { httpApi });
  }
}
