import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { ApiEvent, ApiViewBase } from "./base"
import { ApiView, SubRoute } from "../registry"
import { AlbumApi } from "../test/sampleApp"
import { Context } from "aws-lambda"

interface IMakeApiEvent {
  method: HttpMethod
  path?: string
  routeKey: string
}
function makeApiEvent({ method, routeKey, path = "/" }: IMakeApiEvent): ApiEvent {
  routeKey = `${method.toUpperCase()} ${routeKey}`
  return {
    version: "2.0",
    rawPath: path,
    rawQueryString: "",
    cookies: ["s_fid=7AABXMPL1AFD9BBF-0643XMPL09956DE2", "regStatus=pre-register"],
    headers: {},
    isBase64Encoded: true,
    requestContext: {
      accountId: "foo",
      apiId: "bar",
      domainName: "baz",
      domainPrefix: "blargle",
      http: {
        method,
        path,
        protocol: "https",
        sourceIp: "127.0.0.1",
        userAgent: "Konqueror",
      },
      requestId: "a",
      routeKey,
      stage: "prod",
      time: "abc",
      timeEpoch: 123,
    },
    routeKey,
  }
}

describe("ApiViewBase", () => {
  const view = new AlbumApi()

  describe("dispatch", () => {
    it("dispatches with proper 'this' context", async () => {
      @ApiView({
        path: "/a",
      })
      class CoolViewClass extends ApiViewBase {
        @SubRoute({ path: "/sub", methods: [HttpMethod.ANY] })
        async handler() {
          return this.okay()
        }
        okay() {
          return "OK"
        }
      }
      const inst = new CoolViewClass()
      const result = await inst.dispatch(
        makeApiEvent({ method: HttpMethod.GET, path: "/a/sub", routeKey: "/a/sub" }),
        {} as Context
      )
      expect(result).toEqual("OK")
    })
  })

  describe("findHandler", () => {
    it("locates handler method based on method", () => {
      const request = makeApiEvent({
        method: HttpMethod.POST,
        path: "/album",
        routeKey: "/album",
      })

      expect(view.findHandler(request as ApiEvent)).toEqual(view.post)
    })

    it("locates appropriate method based on request", () => {
      const request = makeApiEvent({
        method: HttpMethod.POST,
        path: "/album/123/like",
        routeKey: "/album/{albumId}/like",
      })

      expect(view.findHandler(request as ApiEvent)).toEqual(view.like)
    })

    it("locates appropriate method with ANY verb", () => {
      @ApiView({
        path: "/proxy",
      })
      class AnyApi extends ApiViewBase {
        @SubRoute({ path: "/sub", methods: [HttpMethod.ANY] })
        async handler() {
          return "OK"
        }
      }

      const request = makeApiEvent({
        method: HttpMethod.POST,
        path: "/proxy/sub",
        routeKey: "/proxy/sub",
      })

      const anyView = new AnyApi()
      expect(anyView.findHandler(request as ApiEvent)).toEqual(anyView.handler)
    })

    it("fails to locate class route with any method", () => {
      @ApiView({
        path: "/proxy",
      })
      class AnyApi extends ApiViewBase {}

      const request = makeApiEvent({
        method: HttpMethod.POST,
        path: "/proxy",
        routeKey: "/proxy",
      })

      const anyView = new AnyApi()
      expect(anyView.findHandler(request as ApiEvent)).toEqual(undefined)
    })

    it("locates no method based on request if no match on routeKey", () => {
      const request = makeApiEvent({
        method: HttpMethod.POST,
        path: "/album/123/like",
        routeKey: "/album/x/{albumId}/like",
      })

      expect(view.findHandler(request as ApiEvent)).toBeUndefined()
    })

    it("locates no method based on request if no match on method", () => {
      const request = makeApiEvent({
        method: HttpMethod.HEAD,
        path: "/album/123/like",
        routeKey: "/album/{albumId}/like",
      })

      expect(view.findHandler(request as ApiEvent)).toBeUndefined()
    })
  })
})
