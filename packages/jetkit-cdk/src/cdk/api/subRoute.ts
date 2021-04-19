import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { Construct } from "@aws-cdk/core";

import { Api, ApiProps } from "./api";

interface ISubRouteApiProps extends ApiProps {
  methods?: HttpMethod[];
}

export class SubRouteApi extends Api {
  methods?: HttpMethod[];

  constructor(
    scope: Construct,
    id: string,
    { methods, ...rest }: ISubRouteApiProps
  ) {
    super(scope, id, rest);
    this.methods = methods;
  }

  addRoutes() {
    // * /path -> lambda integration
    this.httpApi.addRoutes({
      path: this.path,
      methods: this.methods || [HttpMethod.ANY],
      integration: this.lambdaApiIntegration,
    });
  }
}
