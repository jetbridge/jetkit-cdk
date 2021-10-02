import "@aws-cdk/assert/jest"
import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { Stack } from "@aws-cdk/core"
import * as path from "path"
import { ApiFunction, JetKitLambdaFunction } from "./api"
import { dirname } from "dirname-filename-esm"
const __dirname = dirname(import.meta)

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

    new ApiFunction(stack, "V", { handlerFunction, httpApi, methods: [] })

    addRoutesSpy.mockReturnValue([])
    expect(addRoutesSpy).not.toHaveBeenCalled()
  })
})
