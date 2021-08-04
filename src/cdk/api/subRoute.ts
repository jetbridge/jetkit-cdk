import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import { Construct } from "@aws-cdk/core"
import { IApiViewClassMetadata } from "../../metadata"
import { ApiViewMixin, IEndpoint } from "./api"

export interface SubRouteApiProps extends Omit<IEndpoint, "httpApi"> {
  lambdaApiIntegration: LambdaProxyIntegration
  parentApiMeta: IApiViewClassMetadata
  parentPath: string
  path?: string
  httpApi: HttpApi
}

/**
 * Route chained off an existing path and function.
 *
 * @category Construct
 */
export class SubRouteApi extends ApiViewMixin {
  constructor(
    scope: Construct,
    id: string,
    { path, parentPath, unauthorized, authorizationScopes, parentApiMeta, ...rest }: SubRouteApiProps
  ) {
    super(scope, id)

    // join parent path and our path together
    if (path && !path.startsWith("/")) path = `/${path}`
    path = parentPath + (path || "")

    // inherit parent `unauthorized` and `authorizationScopes`
    if (unauthorized === undefined) unauthorized ||= parentApiMeta?.unauthorized
    if (authorizationScopes === undefined) authorizationScopes ||= parentApiMeta?.authorizationScopes

    // add our route to the existing parent API's handler function
    // it will know how to find our method and call it
    this.addRoutes({
      path,
      authorizationScopes,
      unauthorized,
      ...rest,
    })
  }
}
