import "@aws-cdk/assert/jest"
import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { Stack } from "@aws-cdk/core"
import * as path from "path"
import { ApiFunction, JetKitLambdaFunction } from "./api"
import { jest } from "@jest/globals"

const entry = path.join("packages", "cdk", "src", "test", "sampleApp.ts")

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

    new ApiFunction(stack, "V", { handlerFunction, httpApi, methods: [] })

    addRoutesSpy.mockReturnValue([])
    expect(addRoutesSpy).not.toHaveBeenCalled()
  })
})
