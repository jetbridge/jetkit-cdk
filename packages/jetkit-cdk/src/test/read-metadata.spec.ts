import { Column, Entity } from "typeorm";
import { BaseModel } from "demo-repo";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  enumerateMetadata,
  enumerateMethodMetadata,
  getJKMemberMetadata,
  getJKMetadata,
  getJKMetadataKeys,
  hasJKMetadata,
} from "../metadata";
import { CrudApi, Route, SubRoute } from "../registry";
import { CrudApiBase } from "../api/crud/base";

@Entity()
export class Album extends BaseModel {
  @Column({ nullable: true })
  title: string;
}

@CrudApi({ model: Album, route: "/album", memorySize: 512 })
export class AlbumCrudApi extends CrudApiBase {
  @SubRoute("/test")
  async test() {
    return "Testerino";
  }

  post: APIGatewayProxyHandlerV2 = async () => "Posterino";
}

Route({ route: "/blargle" })(async function (event) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  });
});

describe("Metadata decorators", () => {
  describe("@CrudApi decorator", () => {
    it("has metadata", () => {
      expect(hasJKMetadata(AlbumCrudApi)).toBeTruthy();
    });

    it("stores metadata", () => {
      expect(getJKMetadata(AlbumCrudApi)).toMatchObject({
        model: Album,
        apiClass: AlbumCrudApi,
        route: "/album",
        memorySize: 512,
      });
    });
  });

  describe("@SubRoute decorator", () => {
    it("stores metadata on methods", () => {
      // get keys
      expect(getJKMetadataKeys(AlbumCrudApi)).toEqual(["test"]);

      // get meta
      const methodMeta = getJKMemberMetadata(AlbumCrudApi, "test");
      expect(methodMeta).toMatchObject({
        propertyKey: "test",
        route: "/test",
      });
    });

    it("enumerates class metadata", () => {
      const [{ meta, resource }] = enumerateMetadata([AlbumCrudApi]);
      expect(meta).toMatchObject({
        apiClass: AlbumCrudApi,
        entry: __filename,
        memorySize: 512,
        model: Album,
        route: "/album",
      });
      expect(resource).toBe(AlbumCrudApi);
      expect(meta.entry).toMatch(/read-metadata.spec.ts/);
    });

    it("enumerates method metadata", () => {
      const methodMeta = enumerateMethodMetadata(AlbumCrudApi);
      expect(methodMeta).toStrictEqual([
        {
          propertyKey: "test",
          requestHandlerFunc: AlbumCrudApi.prototype.test,
          route: "/test",
        },
      ]);
    });
  });
});
