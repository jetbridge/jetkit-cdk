import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { getApiViewMetadata, getFunctionMetadata, getSubRouteMetadata } from "@jetkit/cdk-runtime"
import { AlbumApi, topSongsFuncInner, topSongsHandler } from "./test/sampleApp"

describe("Metadata decorators", () => {
  describe("@ApiView decorator", () => {
    it("stores metadata", () => {
      expect(getApiViewMetadata(AlbumApi)).toMatchObject({
        apiClass: AlbumApi,
        entry: /sample-app.ts$/,
        memorySize: 512,
        path: "/album",
        environment: {
          LOG_LEVEL: "DEBUG",
        },
      })
    })
  })

  describe("@SubRoute decorator", () => {
    it("stores metadata for subroutes", () => {
      // get meta
      const methodMeta = getSubRouteMetadata(AlbumApi)
      expect(methodMeta.size).toBe(2)
      expect(methodMeta.get("like")).toMatchObject({
        propertyKey: "like",
        HandlerFunc: AlbumApi.prototype.like,
        path: "/{albumId}/like",
        methods: [HttpMethod.POST, HttpMethod.DELETE],
      })
      expect(methodMeta.get("post")).toMatchObject({
        propertyKey: "post",
        HandlerFunc: AlbumApi.prototype.post,
        path: undefined,
        methods: [HttpMethod.POST],
      })
    })
  })

  describe("Function()", () => {
    it("stores metadata on functions with separate Lambda() call", () => {
      const funcMeta = getFunctionMetadata(topSongsHandler)
      expect(funcMeta).toMatchObject({
        entry: /test\/sampleApp.ts$/,
        handler: "topSongsHandler",
        HandlerFunc: topSongsHandler,
        path: "/top-songs",
        methods: [HttpMethod.PUT],
        environment: {
          LOG_LEVEL: "WARN",
        },
      })
    })
    it("stores metadata on functions wrapped with Lambda()", () => {
      const funcMeta = getFunctionMetadata(topSongsFuncInner)
      expect(funcMeta).toMatchObject({
        entry: /test\/sampleApp.ts$/,
        handler: "topSongsFuncInner",
        HandlerFunc: topSongsFuncInner,
        path: "/top-songs-inner",
        methods: [HttpMethod.PUT],
        environment: {
          LOG_LEVEL: "WARN",
        },
      })
    })
  })
})
