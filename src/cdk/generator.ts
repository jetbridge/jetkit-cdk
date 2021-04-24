/**
 * Given a list of application resources with metadata attached,
 * generate appropriate CDK resources.
 *
 * e.g. Parse a list of API classes and their methods and generate
 * API routes and lambda function handlers.
 */

import { HttpApi } from "@aws-cdk/aws-apigatewayv2";
import { Construct } from "@aws-cdk/core";
import { RequestHandler } from "../api/base";
import {
  getApiViewMetadata,
  getRouteMetadata,
  getSubRouteMetadata,
  MetadataTarget,
} from "../metadata";
import { ApiView as ApiViewConstruct } from "./api/api";
import { SubRouteApi } from "./api/subRoute";

interface ResourceGeneratorProps {
  resources: MetadataTarget[];
  httpApi: HttpApi;
}

export class ResourceGenerator extends Construct {
  httpApi: HttpApi;

  constructor(
    scope: Construct,
    id: string,
    { httpApi, resources }: ResourceGeneratorProps
  ) {
    super(scope, id);
    this.httpApi = httpApi;

    // emit CDK constructs for specified resources
    resources.forEach((resource) =>
      this.generateConstructsForResource(resource)
    );
  }

  generateConstructsForResource(resource: MetadataTarget) {
    this.generateConstructsForClass(resource);
    this.generateConstructsForFunction(resource as RequestHandler);
  }

  /**
   * Create function handler for a simple routed function.
   */
  generateConstructsForFunction(resource: RequestHandler) {
    const funcMeta = getRouteMetadata(resource);
    if (!funcMeta) return;

    const { requestHandlerFunc, ...rest } = funcMeta;
    const name = requestHandlerFunc.name;
    new ApiViewConstruct(this, `Func-${name}`, {
      httpApi: this.httpApi,
      entry: funcMeta.entry,
      ...rest,
    });
  }

  /**
   * Create a handler function for the class and any additional
   * routed methods inside it.
   */
  generateConstructsForClass(resource: MetadataTarget) {
    // API view
    const apiViewMeta = getApiViewMetadata(resource);
    let apiViewConstruct: undefined | ApiViewConstruct;
    if (apiViewMeta) {
      const name = apiViewMeta.apiClass.name;
      apiViewConstruct = new ApiViewConstruct(this, `Class-${name}`, {
        httpApi: this.httpApi,
        ...apiViewMeta,
      });
    }

    // SubRoutes - methods with their own routes
    // handled by the classes's handler
    const subRoutes = getSubRouteMetadata(resource);
    if (subRoutes) {
      subRoutes.forEach((meta, subroutePath) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { path: metaPath, propertyKey, ...metaRest } = meta;

        if (!apiViewConstruct)
          throw new Error(
            `${resource} defines SubRoute but no enclosing @ApiView class found`
          );

        // TODO: include parent api class name in id
        // TODO: do something with propertyKey and requestHandlerFunc
        const path = metaPath || subroutePath;
        new SubRouteApi(this, `SubRoute-${meta.propertyKey}`, {
          path,
          ...metaRest,
          parentApi: apiViewConstruct,
        });
      });
    }
  }
}
