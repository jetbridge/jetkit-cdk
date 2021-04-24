// Test that the correct AWS resources are generated from metadata

import "@aws-cdk/assert/jest";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";
import { Stack } from "@aws-cdk/core";
import { ResourceGeneratorConstruct } from "..";
import { AlbumCrudApi, blargleFunc, blargleFuncInner } from "./sampleApp";

describe("@CrudApi construct generation", () => {
  const stack = new Stack();
  const httpApi = new HttpApi(stack, "API");

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumCrudApi],
    httpApi,
  });

  it("generates APIGW routes", () => {
    // should have routes
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /album",
    });
  });

  it("creates lambda handler", () => {
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Handler: "index.handler",
      MemorySize: 512,
      Runtime: "nodejs14.x",
      Environment: {
        Variables: {
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          LOG_LEVEL: "DEBUG",
        },
      },
    });
  });
});

describe("@SubRoute construct generation", () => {
  const stack = new Stack();
  const httpApi = new HttpApi(stack, "API");

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumCrudApi],
    httpApi,
  });

  it("generates APIGW routes", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PATCH /album/test",
    });
  });
});

describe("@Route construct generation", () => {
  const stack = new Stack();
  const httpApi = new HttpApi(stack, "API");

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [blargleFunc, blargleFuncInner],
    httpApi,
  });

  it("generates endpoints for standalone functions", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /blargle",
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LOG_LEVEL: "WARN",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
      Handler: "index.blargleFunc",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    });
  });

  it("generates endpoints for wrapped functions", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /blargleInner",
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LOG_LEVEL: "WARN",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
      Handler: "index.blargleFuncInner",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    });
  });
});
