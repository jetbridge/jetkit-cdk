// Test that the correct AWS resources are generated from metadata

import { HttpApi } from "@aws-cdk/aws-apigatewayv2";
import { Stack } from "@aws-cdk/core";
import { ResourceGeneratorConstruct } from "..";
import { AlbumCrudApi } from "./sample-app";
import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";

describe("CRUD API construct generation", () => {
  it("generates APIGW routes", () => {
    const stack = new Stack();
    const httpApi = new HttpApi(stack, "API");

    // should create routes on httpApi
    // and lambda handler function
    new ResourceGeneratorConstruct(stack, "Gen", {
      resources: [AlbumCrudApi],
      httpApi,
    });

    console.log(SynthUtils.toCloudFormation(stack));

    // should have routes
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /album",
    });

    // should have handler function
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Handler: "index.handler",
      MemorySize: 512,
      Runtime: "nodejs14.x",
      Environment: {
        Variables: {
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    });
  });
});
