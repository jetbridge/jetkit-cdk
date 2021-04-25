import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { badRequest, methodNotAllowed } from "@jdpnielsen/http-error"
import { ApiEvent, ApiResponse, ApiViewBase, apiViewHandler } from "../api/base"
import { ApiView, Route, SubRoute } from "../registry"

@ApiView({
  path: "/album",
  memorySize: 512,
  environment: {
    LOG_LEVEL: "DEBUG",
  },
  bundling: { minify: true, metafile: true, sourceMap: true },
})
export class AlbumApi extends ApiViewBase {
  // define POST handler
  post = async () => "Created new album"

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
export const handler = apiViewHandler(__filename, AlbumApi)

// a simple standalone function with a route attached
export async function topSongsHandler(event: ApiEvent) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  })
}
// define route and lambda properties
Route({
  path: "/top-songs",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
})(topSongsHandler)

// alternate, uglier way of writing the same thing
const topSongsFuncInner = Route({
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
