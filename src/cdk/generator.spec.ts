// Test that the correct AWS resources are generated from metadata

import { stringLike } from "@aws-cdk/assert"
import "@aws-cdk/assert/jest"
import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { FunctionOptions } from "@aws-cdk/aws-lambda"
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs"
import { Duration, Stack } from "@aws-cdk/core"
import * as path from "path"
import { ApiViewConstruct, ResourceGeneratorConstruct } from ".."
import { getFunctionMetadata } from "../metadata"
import { AlbumApi, funcWithConstructHook, scheduledFunc, topSongsFuncInner, topSongsHandler } from "../test/sampleApp"
import { ApiView, JetKitLambdaFunction } from "./api/api"

const bundleBannerMsg = "--- cool bundlings mon ---"

const defaultEnvVars = {
  NODE_OPTIONS: "--enable-source-maps",
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
}

describe("mergeFunctionDefaults", () => {
  const stack = new Stack()
  const httpApi = new HttpApi(stack, "API")

  // should create routes on httpApi
  // and lambda handler function
  const generator = new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumApi],
    httpApi,
    functionOptions: {
      environment: { a: "1" },
      timeout: Duration.seconds(5),
      bundling: {
        banner: bundleBannerMsg,
      },
    },
  })

  it("merges defaults without mutating original", () => {
    const funcOpts: FunctionOptions = {
      environment: {
        override: "true",
      },
    }

    const merged = generator.mergeFunctionDefaults(funcOpts)
    expect(merged.environment).toStrictEqual({ a: "1", override: "true" })

    expect(generator.functionOptions?.environment).toStrictEqual({ a: "1" })
    expect(funcOpts?.environment).toStrictEqual({ override: "true" })
  })
})

describe("@ApiView construct generation", () => {
  const stack = new Stack()
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

  it("saves generated functions", () => {
    expect(generator.generatedFunctions).toHaveLength(1)
    expect(generator.generatedFunctions[0]).toBeInstanceOf(NodejsFunction)
  })

  it("generates APIGW routes", () => {
    // should have routes
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /album",
    })
  })

  it("creates lambda handler", () => {
    expect(stack).toHaveResource("AWS::Lambda::Function", {
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
    const classView = generator.node.findChild("Class-AlbumApi-1") as ApiViewConstruct
    const handlerFunction = classView.handlerFunction
    expect(handlerFunction.bundling).toMatchObject({ banner: bundleBannerMsg })

    // ensure we don't override the defaults with function-specific settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((generator.functionOptions as any).path).toBeFalsy()
    expect(generator.functionOptions?.environment?.LOG_LEVEL).toBeFalsy()
    expect(generator.functionOptions?.entry).toBeFalsy()
  })

  it("creates a route with any method", () => {
    const entry = path.join(__dirname, "..", "test", "sampleApp.ts")
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")
    const handlerFunction = new JetKitLambdaFunction(stack, "Func", { entry })

    new ApiView(stack, "V1", {
      path: "/x",
      httpApi,
      handlerFunction,
      methods: [],
    })

    const view = new ApiView(stack, "V2", {
      path: "/a",
      httpApi,
      handlerFunction,
      // methods defaults to [ANY]
    })

    expect(addRoutesSpy).toHaveBeenCalledWith({
      path: "/a",
      methods: [HttpMethod.ANY],
      integration: view.lambdaApiIntegration,
    })
  })
})

describe("@SubRoute construct generation", () => {
  const stack = new Stack()
  const httpApi = new HttpApi(stack, "API")

  // should create routes on httpApi
  // and lambda handler function
  new ResourceGeneratorConstruct(stack, "Gen", {
    resources: [AlbumApi],
    httpApi,
  })

  it("generates APIGW DELETE route", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "DELETE /album/{albumId}/like",
    })
  })
  it("generates APIGW POST route", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /album/{albumId}/like",
    })
  })
  it("has route outputs", () => {
    expect(stack).toHaveOutput({
      outputName: "GenSubRoutelikeRoute6CEDD760E",
      outputValue: "POST,DELETE /album/{albumId}/like",
    })
    expect(stack).toHaveOutput({
      outputName: "GenClassAlbumApi1Route59A25E34B",
      outputValue: "ANY /album",
    })
    expect(stack).toHaveOutput({
      exportName: {
        "Fn::Join": [
          "-",
          [
            {
              Ref: "AWS::StackName",
            },
            "ApiBase",
          ],
        ],
      },
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

describe("Lambda() construct generation of APIs", () => {
  let stack: Stack
  let httpApi: HttpApi
  let generator: ResourceGeneratorConstruct

  beforeEach(() => {
    stack = new Stack()
    httpApi = new HttpApi(stack, "API")

    // should create routes on httpApi
    // and lambda handler function
    generator = new ResourceGeneratorConstruct(stack, "Gen", {
      resources: [topSongsHandler, topSongsFuncInner],
      httpApi,
    })
  })

  it("saves generated functions", () => {
    expect(generator.generatedFunctions).toHaveLength(2)
    expect(generator.generatedFunctions[0]).toBeInstanceOf(NodejsFunction)
    expect(generator.generatedFunctions[1]).toBeInstanceOf(NodejsFunction)
  })

  it("generates endpoints for standalone functions", () => {
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /top-songs",
    })
    expect(stack).toHaveResource("AWS::Lambda::Function", {
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
    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /top-songs-inner",
    })
    expect(stack).toHaveResource("AWS::Lambda::Function", {
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

describe("Lambda() construct scheduling", () => {
  let stack: Stack

  beforeEach(() => {
    stack = new Stack()
  })

  it("schedules functions", () => {
    new ResourceGeneratorConstruct(stack, "Gen", {
      resources: [scheduledFunc],
    })

    expect(stack).toHaveResource("AWS::Events::Rule", {
      Description: "Lambda for scheduledFunc",
      ScheduleExpression: "rate(10 minutes)",
      State: "ENABLED",
      Targets: [
        {
          Arn: {
            "Fn::GetAtt": [stringLike("GenFuncscheduledFunc*"), "Arn"],
          },
          Id: "Target0",
        },
      ],
    })
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: defaultEnvVars,
      },
      Handler: "index.scheduledFunc",
      MemorySize: 384,
      Runtime: "nodejs14.x",
    })
  })
})

describe("Lambda() construct generation hook", () => {
  let stack: Stack

  beforeEach(() => {
    stack = new Stack()
  })

  it("calls hook", () => {
    const generator = new ResourceGeneratorConstruct(stack, "Gen", {
      resources: [funcWithConstructHook],
    })

    expect(stack).toHaveResource("AWS::Lambda::Function", {
      MemorySize: 1024,
    })

    const meta = getFunctionMetadata(funcWithConstructHook)

    const constructMock = jest.fn()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    meta!.construct = constructMock

    expect(constructMock).toHaveBeenCalledTimes(1)
    expect(constructMock).toHaveBeenCalledWith({
      stack,
      functionConstruct: generator.generatedFunctions[0],
    })
  })
})
