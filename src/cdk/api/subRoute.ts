import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { Construct } from "@aws-cdk/core";
import { Api } from "./api";

interface ISubRouteApiProps {
  methods?: HttpMethod[];
  parentApi: Api;
  path: string;
}

export class SubRouteApi extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { methods, parentApi, path }: ISubRouteApiProps
  ) {
    super(scope, id);

    // join parent path and our path together
    if (!path.startsWith("/")) path = `/${path}`;
    path = parentApi.path + path;

    // add our route to the existing parent API's handler function
    // it will know how to find our method and call it
    parentApi.httpApi.addRoutes({
      path,
      methods: methods || [HttpMethod.ANY],
      integration: parentApi.lambdaApiIntegration,
    });
  }
}
