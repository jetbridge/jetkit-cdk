import "@aws-cdk/assert/jest"
import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { Stack } from "@aws-cdk/core"
import { ApiView } from "./api"
import * as path from "path"

const entry = path.join(__dirname, "..", "..", "test", "sampleApp.ts")

describe("ApiView", () => {
  let stack: Stack
  let httpApi: HttpApi

  beforeEach(() => {
    stack = new Stack()
    httpApi = new HttpApi(stack, "API")
  })

  it("doesn't create a route if no methods", () => {
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")

    new ApiView(stack, "V", { httpApi, entry, methods: [] })

    addRoutesSpy.mockReturnValue([])
    expect(addRoutesSpy).not.toHaveBeenCalled()
  })

  it("creates a route with methods", () => {
    const addRoutesSpy = jest.spyOn(httpApi, "addRoutes")

    const view = new ApiView(stack, "V", {
      path: "/a",
      httpApi,
      entry,
      methods: [HttpMethod.GET, HttpMethod.POST],
    })

    expect(addRoutesSpy).toHaveBeenCalledWith({
      path: "/a",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: view.lambdaApiIntegration,
    })
  })
})
