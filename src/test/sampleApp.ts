import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { BaseModel } from "../database/baseModel";
import { Column, Entity } from "typeorm";
import { APIEvent, ApiViewBase } from "../api/base";
import { ApiView, Route, SubRoute } from "../registry";

// sample database model
@Entity()
export class Album extends BaseModel {
  @Column({ nullable: true })
  title: string;
}

@ApiView({
  model: Album,
  path: "/album",
  memorySize: 512,
  environment: {
    LOG_LEVEL: "DEBUG",
  },
})
export class AlbumCrudApi extends ApiViewBase {
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
export async function blargleFunc(event: APIEvent) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  });
}
Route({
  path: "/blargle",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
})(blargleFunc);

// alternate, uglier way of writing the same thing
const blargleFuncInner = Route({
  path: "/blargleInner",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
})(async function blargleFuncInner(event: APIEvent) {
  return `cookies: ${event.cookies}`;
});
export { blargleFuncInner };
