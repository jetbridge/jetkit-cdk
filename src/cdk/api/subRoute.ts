import { Construct } from "@aws-cdk/core"
import { ApiView, ApiViewMixin, IEndpoint } from "./api"

export interface ISubRouteApiProps extends Omit<IEndpoint, "httpApi"> {
  parentApi: ApiView
  path: string
}

/**
 * Route chained off an existing route and function.
 *
 * @category Construct
 */
export class SubRouteApi extends ApiViewMixin {
  constructor(scope: Construct, id: string, { methods, parentApi, path }: ISubRouteApiProps) {
    super(scope, id)

    // join parent path and our path together
    if (!path.startsWith("/")) path = `/${path}`
    path = parentApi.path + path

    // add our route to the existing parent API's handler function
    // it will know how to find our method and call it
    this.addRoutes({
      path,
      methods,
      httpApi: parentApi.httpApi,
      lambdaApiIntegration: parentApi.lambdaApiIntegration,
    })
  }
}
