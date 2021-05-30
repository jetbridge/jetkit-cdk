import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { getApiViewMetadata, getFunctionMetadata, getSubRouteMetadata } from "../metadata"
import { AlbumApi, topSongsFuncInner, topSongsHandler } from "./sampleApp"

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
      const expectedMeta = {
        propertyKey: "like",
        requestHandlerFunc: AlbumApi.prototype.like,
        path: "/{albumId}/like",
        methods: [HttpMethod.POST, HttpMethod.DELETE],
      }
      expect(methodMeta.size).toBe(1)
      expect(methodMeta.get("like")).toMatchObject(expectedMeta)
    })
  })

  describe("Function()", () => {
    it("stores metadata on functions with separate Lambda() call", () => {
      const funcMeta = getFunctionMetadata(topSongsHandler)
      expect(funcMeta).toMatchObject({
        entry: /test\/sampleApp.ts$/,
        handler: "topSongsHandler",
        requestHandlerFunc: topSongsHandler,
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
        requestHandlerFunc: topSongsFuncInner,
        path: "/top-songs-inner",
        methods: [HttpMethod.PUT],
        environment: {
          LOG_LEVEL: "WARN",
        },
      })
    })
  })
})
