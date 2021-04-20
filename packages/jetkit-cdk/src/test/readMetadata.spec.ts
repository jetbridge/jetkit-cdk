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
  wrappedBlargleFunc,
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
    it("stores metadata on functions", () => {
      const funcMeta = getRouteMetadata(wrappedBlargleFunc);
      expect(funcMeta).toMatchObject({
        entry: /test\/sampleApp.ts$/,
        requestHandlerFunc: blargleFunc,
        path: "/blargle",
        methods: [HttpMethod.PUT],
        environment: {
          LOG_LEVEL: "WARN",
        },
      });
    });
  });
});
