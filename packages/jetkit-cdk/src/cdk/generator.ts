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
  enumerateMetadata,
  enumerateMethodMetadata,
  getJKMetadataKeys,
  MetadataTarget,
} from "../metadata";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";

interface ResourceGeneratorProps {
  resources: MetadataTarget[];
  httpApi: HttpApi;
}

export class ResourceGenerator extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { resources, httpApi }: ResourceGeneratorProps
  ) {
    super(scope, id);

    enumerateMetadata(resources).forEach(({ meta, resource }) => {
      const apiClass = meta.apiClass;
      console.log(meta);
      const name = meta.apiClass.name;
      new CrudApiConstruct(this, name, {
        resource,
        httpApi,
        ...meta,
      });

      const metadataTarget: MetadataTarget = resource.constructor;
      console.log("keys", getJKMetadataKeys(resource.constructor));
      console.log("ApiClass", apiClass);
      console.log("Ctor", apiClass.constructor);
      console.log("Target=====", metadataTarget);
    });
  }
}
