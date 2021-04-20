import { CrudApi, Route, SubRoute } from "../registry";
import { CrudApiBase } from "../api/crud/base";
import { RequestHandler } from "../api/base";
import { Column, Entity } from "typeorm";
import { BaseModel } from "demo-repo";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

// sample database model
@Entity()
export class Album extends BaseModel {
  @Column({ nullable: true })
  title: string;
}

// sample CRUD view
@CrudApi({
  model: Album,
  path: "/album",
  memorySize: 512,
  environment: {
    LOG_LEVEL: "DEBUG",
  },
})
export class AlbumCrudApi extends CrudApiBase {
  // custom endpoint in the view
  @SubRoute({
    path: "/test",
    methods: [HttpMethod.PATCH],
    environment: {
      LOG_LEVEL: "DEBUG",
    },
  })
  async test() {
    return "Testerino";
  }

  // override post handler
  post: APIGatewayProxyHandlerV2 = async () => "Posterino";
}

// a simple standalone function with a route attached
export const blargleFunc: RequestHandler = async (event) => {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  });
};
export const wrappedBlargleFunc = Route({
  path: "/blargle",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
})(blargleFunc);
