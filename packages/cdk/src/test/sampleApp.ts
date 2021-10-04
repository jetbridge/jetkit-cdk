import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { Schedule } from "@aws-cdk/aws-events"
import { Duration } from "@aws-cdk/core"
import { badRequest, methodNotAllowed } from "@jdpnielsen/http-error"
import { PreSignUpTriggerHandler } from "aws-lambda"
import { ApiViewBase, apiViewHandler } from "@jetkit/cdk-runtime"
import { ApiEvent, ApiResponse, ApiView, Lambda, SubRoute } from "@jetkit/cdk-runtime"
import { ApiViewCdk, LambdaCdk } from "../registry"

/**
 * @internal
 */
@ApiViewCdk({
  path: "/album",
  memorySize: 512,
  environment: {
    LOG_LEVEL: "DEBUG",
  },
  timeout: Duration.seconds(10),
  bundling: { minify: true, metafile: true, sourceMap: true },
})
export class AlbumApi extends ApiViewBase {
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
  async like(event: ApiEvent): ApiResponse {
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
/**
 * @internal
 */
export const handler = apiViewHandler(__filename, AlbumApi)

// a simple standalone function with a route attached
/**
 * @internal
 */
export async function topSongsHandler(event: ApiEvent) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  })
}
// define route and lambda properties
LambdaCdk({
  path: "/top-songs",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
})(topSongsHandler)

// alternate, uglier way of writing the same thing
/**
 * @internal
 */
const topSongsFuncInner = LambdaCdk({
  path: "/top-songs-inner",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
  // this function name should match the exported name
  // or you must specify the exported function name in `handler`
})(async function topSongsFuncInner(event: ApiEvent) {
  return `cookies: ${event.cookies}`
})
export { topSongsFuncInner }

// run every 10m
export const scheduledFunc = () => console.log("scheduled function run")
LambdaCdk({
  memorySize: 384,
  schedule: Schedule.rate(Duration.minutes(10)),
})(scheduledFunc)

// unauthorized route
export const unauthFunc = () => console.log("does not require authorization")
Lambda({
  unauthorized: true,
  path: "/unauthorized",
})(unauthFunc)

// unauthorized ApiView
@ApiView({
  unauthorized: true,
  path: "/unauthView",
})
export class UnAuthView extends ApiViewBase {
  @SubRoute({ methods: [HttpMethod.GET] })
  async get() {
    return "blorp"
  }
}

// authorized ApiView
@ApiView({
  path: "/authView",
  authorizationScopes: ["charts:read"],
})
export class AuthScopeView extends ApiViewBase {
  @SubRoute({ methods: [HttpMethod.GET] })
  async get() {
    return "blorp"
  }
}

// authorized func
export const authFunc = () => console.log("requires authorization")
Lambda({
  authorizationScopes: ["charts:write"],
  path: "/authorized",
})(authFunc)

// sample cognito trigger handler
export const preSignUpHandler: PreSignUpTriggerHandler = async (event) => {
  return event
}
Lambda({})(preSignUpHandler)
