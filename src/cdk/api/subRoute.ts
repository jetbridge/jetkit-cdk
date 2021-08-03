import { Construct } from "@aws-cdk/core"
import { ApiView, ApiViewMixin, IEndpoint } from "./api"

export interface SubRouteApiProps extends Omit<IEndpoint, "httpApi"> {
  parentApi: ApiView
  path?: string
}

/**
 * Route chained off an existing path and function.
 *
 * @category Construct
 */
export class SubRouteApi extends ApiViewMixin {
  constructor(scope: Construct, id: string, { parentApi, path, ...rest }: SubRouteApiProps) {
    super(scope, id)

    // join parent path and our path together
    if (path && !path.startsWith("/")) path = `/${path}`
    path = parentApi.path + (path || "")

    // add our route to the existing parent API's handler function
    // it will know how to find our method and call it
    this.addRoutes({
      path,
      httpApi: parentApi.httpApi,
      lambdaApiIntegration: parentApi.lambdaApiIntegration,
      ...rest,
    })
  }
}
