// Test that the correct AWS resources are generated from metadata

import { stringLike } from "@aws-cdk/assert"
import "@aws-cdk/assert/jest"
import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from "@aws-cdk/aws-apigatewayv2-authorizers"
import { Code, Function, FunctionOptions, Runtime } from "@aws-cdk/aws-lambda"
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs"
import { Duration, Stack } from "@aws-cdk/core"
import * as path from "path"
import { ResourceGeneratorConstruct } from ".."
import {
  AlbumApi,
  authFunc,
  AuthScopeView,
  scheduledFunc,
  topSongsFuncInner,
  topSongsHandler,
  unauthFunc,
  UnAuthView,
} from "../test/sampleApp"
import { ApiFunction, JetKitLambdaFunction } from "./api/api"
import { Node14Func } from "./lambda/node14func"

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
    expect(generator.generatedLambdas).toHaveLength(1)
    expect(generator.generatedLambdas[0]).toBeInstanceOf(NodejsFunction)
  })

  it("can find APIView function by name", () => {
    const found = generator.getFunction({ name: "AlbumApi" })
    expect(found).toBeTruthy()
    expect(found).toBeInstanceOf(Node14Func)
    expect(found?.name).toEqual("AlbumApi")
  })

  it("can find APIView function by ctor", () => {
    const found = generator.getFunction({ ctor: AlbumApi })
    expect(found).toBeTruthy()
    expect(found).toBeInstanceOf(Node14Func)
    expect(found?.name).toEqual("AlbumApi")
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
    const handlerFunction = generator.node.findChild("F1-AlbumApi") as JetKitLambdaFunction
    expect(handlerFunction.bundling).toMatchObject({ banner: bundleBannerMsg })

    // ensure we don't override the defaults with function-specific settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((generator.functionOptions as any).path).toBeFalsy()
    expect(generator.functionOptions?.environment?.LOG_LEVEL).toBeFalsy()
    expect(generator.functionOptions?.entry).toBeFalsy()
  })

  it("doesn't create routes for empty api view", () => {
    const entry = path.join(__dirname, "..", "test", "sampleApp.ts")
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")
    const handlerFunction = new JetKitLambdaFunction(stack, "Func", { entry })

    new ApiFunction(stack, "V1", {
      path: "/x",
      httpApi,
      handlerFunction,
      methods: [],
    })

    expect(addRoutesSpy).not.toHaveBeenCalled()
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
      outputName: "GenSRAlbumApilikeRoute6C6175CC5",
      outputValue: "POST,DELETE /album/{albumId}/like",
    })
    expect(stack).toHaveOutput({
      outputName: "GenSRAlbumApipostRoute5F0E8C334",
      outputValue: "POST /album",
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
    expect(generator.generatedLambdas).toHaveLength(2)
    expect(generator.generatedLambdas[0]).toBeInstanceOf(NodejsFunction)
    expect(generator.generatedLambdas[1]).toBeInstanceOf(NodejsFunction)
  })

  it("can find Lambda function by ctor", () => {
    const found = generator.getFunction({ ctor: topSongsHandler })
    expect(found).toBeTruthy()
    expect(found).toBeInstanceOf(Node14Func)
    expect(found?.name).toEqual("topSongsHandler")
  })

  it("can find Lambda function by name", () => {
    const found = generator.getFunction({ name: "topSongsHandler" })
    expect(found).toBeTruthy()
    expect(found).toBeInstanceOf(Node14Func)
    expect(found?.name).toEqual("topSongsHandler")
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

describe("Authorization", () => {
  let stack: Stack
  let httpApi: HttpApi

  beforeEach(() => {
    stack = new Stack()

    // dummy authorizer
    const authHandler = new Function(stack, "auth-function", {
      code: Code.fromInline("1"),
      runtime: Runtime.NODEJS,
      handler: "main",
    })
    const authorizer = new HttpLambdaAuthorizer({
      handler: authHandler,
      authorizerName: "dummy",
    })

    httpApi = new HttpApi(stack, "API", { defaultAuthorizer: authorizer })
  })

  it("disables authorization functions", () => {
    new ResourceGeneratorConstruct(stack, "Gen", {
      httpApi,
      resources: [unauthFunc],
    })

    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /unauthorized",
      AuthorizationType: "NONE",
    })
  })

  it("inherits disabled authorization for ApiView", () => {
    new ResourceGeneratorConstruct(stack, "Gen", {
      httpApi,
      resources: [UnAuthView],
    })

    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /unauthView",
      AuthorizationType: "NONE",
    })
  })

  it("requires authorization scopes for function route", () => {
    new ResourceGeneratorConstruct(stack, "Gen", {
      httpApi,
      resources: [authFunc],
    })

    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationScopes: ["charts:write"],
      RouteKey: "ANY /authorized",
      AuthorizationType: "CUSTOM",
      AuthorizerId: {
        Ref: stringLike("APIdummy*"),
      },
    })
  })

  it("inherits authorization scopes for ApiView", () => {
    new ResourceGeneratorConstruct(stack, "Gen", {
      httpApi,
      resources: [AuthScopeView],
    })

    expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationScopes: ["charts:read"],
      RouteKey: "GET /authView",
      AuthorizationType: "CUSTOM",
      AuthorizerId: {
        Ref: stringLike("APIdummy*"),
      },
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
            "Fn::GetAtt": [stringLike("GenF*scheduledFunc*"), "Arn"],
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
