import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import {
  getCrudApiMetadata,
  getRouteMetadata,
  getSubRouteMetadata,
  hasCrudApiMetadata,
} from "../metadata";
import {
  Album,
  AlbumCrudApi,
  blargleFunc,
  blargleFuncInner,
} from "./sampleApp";

describe("Metadata decorators", () => {
  describe("@CrudApi decorator", () => {
    it("has metadata", () => {
      expect(hasCrudApiMetadata(AlbumCrudApi)).toBeTruthy();
    });

    it("stores metadata", () => {
      expect(getCrudApiMetadata(AlbumCrudApi)).toMatchObject({
        apiClass: AlbumCrudApi,
        entry: /sample-app.ts$/,
        memorySize: 512,
        model: Album,
        path: "/album",
        environment: {
          LOG_LEVEL: "DEBUG",
        },
      });
    });
  });

  describe("@SubRoute decorator", () => {
    it("stores metadata for subroutes", () => {
      // get meta
      const methodMeta = getSubRouteMetadata(AlbumCrudApi);
      const expectedMeta = {
        propertyKey: "test",
        requestHandlerFunc: AlbumCrudApi.prototype.test,
        path: "/test",
        methods: [HttpMethod.PATCH],
      };
      expect(methodMeta.size).toBe(1);
      expect(methodMeta.get("test")).toMatchObject(expectedMeta);
    });
  });

  describe("Route()", () => {
    it("stores metadata on functions with separate Route() call", () => {
      const funcMeta = getRouteMetadata(blargleFunc);
      expect(funcMeta).toMatchObject({
        entry: /test\/sampleApp.ts$/,
        handler: "blargleFunc",
        requestHandlerFunc: blargleFunc,
        path: "/blargle",
        methods: [HttpMethod.PUT],
        environment: {
          LOG_LEVEL: "WARN",
        },
      });
    });
    it("stores metadata on functions wrapped with Route()", () => {
      const funcMeta = getRouteMetadata(blargleFuncInner);
      expect(funcMeta).toMatchObject({
        entry: /test\/sampleApp.ts$/,
        handler: "blargleFuncInner",
        requestHandlerFunc: blargleFuncInner,
        path: "/blargleInner",
        methods: [HttpMethod.PUT],
        environment: {
          LOG_LEVEL: "WARN",
        },
      });
    });
  });
});
