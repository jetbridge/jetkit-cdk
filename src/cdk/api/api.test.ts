import "@aws-cdk/assert/jest"
import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { Stack } from "@aws-cdk/core"
import * as path from "path"
import { ApiView, JetKitLambdaFunction } from "./api"

const entry = path.join(__dirname, "..", "..", "test", "sampleApp.ts")

describe("ApiView", () => {
  let stack: Stack
  let httpApi: HttpApi
  let handlerFunction: JetKitLambdaFunction

  beforeEach(() => {
    stack = new Stack()
    httpApi = new HttpApi(stack, "API")
    handlerFunction = new JetKitLambdaFunction(stack, "func", { entry })
  })

  it("doesn't create a route if no methods", () => {
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")

    new ApiView(stack, "V", { handlerFunction, httpApi, methods: [] })

    addRoutesSpy.mockReturnValue([])
    expect(addRoutesSpy).not.toHaveBeenCalled()
  })

  it("creates a route with any method", () => {
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")

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

  it("creates a route with methods", () => {
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")

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
      methods: [HttpMethod.GET, HttpMethod.POST],
    })

    expect(addRoutesSpy).toHaveBeenCalledWith({
      path: "/a",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: view.lambdaApiIntegration,
    })
  })
})