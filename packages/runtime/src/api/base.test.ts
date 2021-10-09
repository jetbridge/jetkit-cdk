import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { ApiViewBase } from "./base"
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda"
import { ApiView, SubRoute } from "../registry"
import { ApiEvent } from "../types"
import { badRequest, methodNotAllowed } from "@jdpnielsen/http-error"

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

@ApiView({
  path: "/album",
})
class AlbumApi extends ApiViewBase {
  // define POST handler
  @SubRoute({ methods: [HttpMethod.POST] })
  async post() {
    return "Created new album"
  }

  // custom endpoint in the view
  // routes to the ApiView function
  @SubRoute({
    path: "/{albumId}/like", // will be /album/123/like
    methods: [HttpMethod.POST, HttpMethod.DELETE],
  })
  async like(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<never>> {
    const albumId = event.pathParameters?.albumId
    if (!albumId) throw badRequest("albumId is required in path")

    const method = event.requestContext.http.method

    // POST - mark album as liked
    if (method == HttpMethod.POST) return `Liked album ${albumId}`
    // DELETE - unmark album as liked
    else if (method == HttpMethod.DELETE) return `Unliked album ${albumId}`
    else return methodNotAllowed()
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
