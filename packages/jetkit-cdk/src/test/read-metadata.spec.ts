import { Column, Entity } from "typeorm";
import { BaseModel } from "demo-repo";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getJKMetadata, getJKMetadataKeys, hasJKMetadata } from "../metadata";
import { CrudApi, Route, SubRoute } from "../registry";
import { CrudApiBase } from "../api/crud/base";

@Entity()
export class Album extends BaseModel {
  @Column({ nullable: true })
  title: string;
}

@CrudApi({ model: Album, route: "/topic", memorySize: 512 })
export class TopicCrudApi extends CrudApiBase {
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
      expect(hasJKMetadata(TopicCrudApi)).toBeTruthy();
    });

    it("stores metadata", () => {
      expect(getJKMetadata(TopicCrudApi)).toMatchObject({
        model: Album,
        apiClass: TopicCrudApi,
        route: "/topic",
        memorySize: 512,
      });
    });
  });

  describe("@SubRoute decorator", () => {
    it("stores metadata on methods", () => {
      expect(getJKMetadataKeys(TopicCrudApi)).toEqual(["/test"]);
    });
  });
});
