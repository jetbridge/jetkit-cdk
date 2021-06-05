import { Construct } from "@aws-cdk/core"
import { ApiView, ApiViewMixin, IEndpoint } from "./api"

export interface ISubRouteApiProps extends Omit<IEndpoint, "methods"> {
  path: string
}

/**
 * Route chained off an existing route and function.
 *
 * @category Construct
 */
export class SubRouteApi extends Construct {
  constructor(scope: Construct, id: string, { httpApi, path }: ISubRouteApiProps) {
    super(scope, id)

    // fetch OpenAPI spec and return it
  }
}
