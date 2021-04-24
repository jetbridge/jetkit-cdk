// Test that the correct AWS resources are generated from metadata

import "@aws-cdk/assert/jest";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";
import { Stack } from "@aws-cdk/core";
import { ResourceGeneratorConstruct } from "..";
import { AlbumApi, topSongsHandler, topSongsFuncInner } from "./sampleApp";

describe("@ApiView construct generation", () => {
  const stack = new Stack();
  const httpApi = new HttpApi(stack, "API");

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumApi],
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
    resources: [AlbumApi],
    httpApi,
  });

  it("generates APIGW DELETE route", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "DELETE /album/{albumId}/like",
    });
  });
  it("generates APIGW POST route", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /album/{albumId}/like",
    });
  });
});

describe("@Route construct generation", () => {
  const stack = new Stack();
  const httpApi = new HttpApi(stack, "API");

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [topSongsHandler, topSongsFuncInner],
    httpApi,
  });

  it("generates endpoints for standalone functions", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /top-songs",
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LOG_LEVEL: "WARN",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
      Handler: "index.topSongsHandler",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    });
  });

  it("generates endpoints for wrapped functions", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /top-songs-inner",
    });
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LOG_LEVEL: "WARN",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
      Handler: "index.topSongsHandler",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    });
  });
});
