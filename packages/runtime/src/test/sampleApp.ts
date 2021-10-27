import { HttpMethod } from "../types"
import { badRequest, methodNotAllowed } from "@jdpnielsen/http-error"
import { APIGatewayProxyResultV2, APIGatewayProxyEventV2 } from "aws-lambda"
import { ApiView, Lambda, SubRoute } from "../registry"

/**
 * @internal
 */
@ApiView({
  path: "/album",
})
export class AlbumApi {
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
/**
 * @internal
 */
// export const handler = apiViewHandler(__filename, AlbumApi)

// a simple standalone function with a route attached
/**
 * @internal
 */
export async function topSongsHandler(event: APIGatewayProxyEventV2) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  })
}
// define route and lambda properties
Lambda({
  path: "/top-songs",
  methods: [HttpMethod.PUT],
})(topSongsHandler)

// alternate, uglier way of writing the same thing
/**
 * @internal
 */
const topSongsFuncInner = Lambda({
  path: "/top-songs-inner",
  methods: [HttpMethod.PUT],
  // this function name should match the exported name
  // or you must specify the exported function name in `handler`
})(async function topSongsFuncInner(event: APIGatewayProxyEventV2) {
  return `cookies: ${event.cookies}`
})
export { topSongsFuncInner }
