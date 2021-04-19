import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

import { Api } from "./api";

export class CrudApi extends Api {
  addRoutes() {
    // * /path -> lambda integration
    this.httpApi.addRoutes({
      path: this.path,
      methods: [HttpMethod.ANY],
      integration: this.lambdaApiIntegration,
    });
  }
}
