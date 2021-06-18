// Test that the correct AWS resources are generated from metadata

import "@aws-cdk/assert/jest"
import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { App, Stack } from "@aws-cdk/core"
import { ApiViewConstruct, ResourceGeneratorConstruct } from ".."
import { AlbumApi, topSongsFuncInner, topSongsHandler } from "./sampleApp"

const bundleBannerMsg = "--- cool bundlings mon ---"

const defaultEnvVars = {
  NODE_OPTIONS: "--enable-source-maps",
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
}

describe("@ApiView construct generation", () => {
  const app = new App()
  const stack = new Stack(app, "STACK")
  const httpApi = new HttpApi(stack, "API")

  // should create routes on httpApi
  // and lambda handler function
  const generator = new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumApi],
    httpApi,
    functionOptions: {
      bundling: {
        banner: bundleBannerMsg,
      },
    },
  })

  const template = app.synth().getStackByName(stack.stackName).template

  it("generates APIGW routes", () => {
    // should have routes
    expect(template).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /album",
    })
  })

  it("creates lambda handler", () => {
    expect(template).toHaveResource("AWS::Lambda::Function", {
      Handler: "index.handler",
      MemorySize: 512,
      Runtime: "nodejs14.x",
      Environment: {
        Variables: {
          LOG_LEVEL: "DEBUG",
          ...defaultEnvVars,
        },
      },
    })

    // are defaults passed through?
    const classView = generator.node.findChild("Class-AlbumApi") as ApiViewConstruct
    const handlerFunction = classView.handlerFunction
    expect(handlerFunction.bundling).toMatchObject({ banner: bundleBannerMsg })
  })
})

describe("@SubRoute construct generation", () => {
  const app = new App()
  const stack = new Stack(app, "STACK")
  const httpApi = new HttpApi(stack, "API")

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumApi],
    httpApi,
  })

  const template = app.synth().getStackByName(stack.stackName).template

  it("generates APIGW DELETE route", () => {
    expect(template).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "DELETE /album/{albumId}/like",
    })
  })

  it("generates APIGW POST route", () => {
    expect(template).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /album/{albumId}/like",
    })
  })

  it("has route outputs", () => {
    expect(template).toHaveOutput({
      outputName: "GenSubRoutelikeRoute176CE77B5",
      outputValue: "POST,DELETE /album/{albumId}/like",
    })
    expect(template).toHaveOutput({
      outputName: "GenClassAlbumApiRoute1AA2A9EC9",
      outputValue: "ANY /album",
    })
    expect(template).toHaveOutput({
      exportName: "ApiBase",
      outputValue: {
        "Fn::Join": [
          "",
          [
            "https://",
            {
              Ref: "API62EA1CFF",
            },
            ".execute-api.",
            {
              Ref: "AWS::Region",
            },
            ".",
            {
              Ref: "AWS::URLSuffix",
            },
            "/",
          ],
        ],
      },
    })
  })
})

describe("@Lambda construct generation", () => {
  const app = new App()
  const stack = new Stack(app, "STACK")
  const httpApi = new HttpApi(stack, "API")

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [topSongsHandler, topSongsFuncInner],
    httpApi,
  })

  const template = app.synth().getStackByName(stack.stackName).template

  it("generates endpoints for standalone functions", () => {
    expect(template).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /top-songs",
    })
    expect(template).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LOG_LEVEL: "WARN",
          ...defaultEnvVars,
        },
      },
      Handler: "index.topSongsHandler",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    })
  })

  it("generates endpoints for wrapped functions", () => {
    expect(template).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /top-songs-inner",
    })
    expect(template).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LOG_LEVEL: "WARN",
          ...defaultEnvVars,
        },
      },
      Handler: "index.topSongsHandler",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    })
  })
})
