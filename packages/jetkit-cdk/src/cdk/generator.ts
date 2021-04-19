/**
 * Given a list of application resources with metadata attached,
 * generate appropriate CDK resources.
 *
 * e.g. Parse a list of API classes and their methods and generate
 * API routes and lambda function handlers.
 */

import { Construct } from "@aws-cdk/core";
import { CrudApi as CrudApiConstruct } from "./api/crud";
import {
  getCrudApiMetadata,
  getSubRouteMetadata,
  MetadataTarget,
} from "../metadata";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";
import { SubRouteApi } from "./api/subRoute";

interface ResourceGeneratorProps {
  resources: MetadataTarget[];
  httpApi: HttpApi;
}

export class ResourceGenerator extends Construct {
  constructor(scope: Construct, id: string, props: ResourceGeneratorProps) {
    super(scope, id);

    props.resources.forEach((resource) => {
      // CRUD API
      const crudApi = getCrudApiMetadata(resource);
      if (crudApi) {
        const name = crudApi.apiClass.name;
        new CrudApiConstruct(this, name, {
          ...props,
          ...crudApi,
        });
      }

      // SubRoutes - methods with their own routes
      // handled by the classes's handler
      const subRoutes = getSubRouteMetadata(resource);
      if (subRoutes) {
        subRoutes.forEach((meta, subroutePath) => {
          const {
            requestHandlerFunc,
            path: metaPath,
            propertyKey,
            ...metaRest
          } = meta;
          // TODO: include parent api class name in id
          // TODO: do something with propertyKey and requestHandlerFunc
          const path = metaPath || subroutePath;
          new SubRouteApi(this, `SubRoute-${meta.propertyKey}`, {
            ...props,
            path,
            ...metaRest,
          });
        });
      }
    });
  }
}
