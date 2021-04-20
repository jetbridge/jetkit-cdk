import { CrudApiBase, CrudApi, Route, SubRoute } from "@jetkit/cdk";
import { Column, Entity } from "typeorm";
import { BaseModel } from "demo-repo";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
// import { app } from ".dd./app";

/**
 * Forum topic
 */
@Entity()
export class Topic extends BaseModel {
  @Column({ nullable: true })
  name: string;
}

@CrudApi({ model: Topic, path: "/topic", memorySize: 512 })
export class TopicCrudApi extends CrudApiBase {
  @SubRoute({ path: "/test" })
  async test() {
    return "Testerino";
  }

  post: APIGatewayProxyHandlerV2 = async () => "Posterino";
}

Route({ path: "/blargle" })(async function (event) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  });
});

export const handler: APIGatewayProxyHandlerV2 = async (event, context) =>
  new TopicCrudApi().dispatch(event, context);
