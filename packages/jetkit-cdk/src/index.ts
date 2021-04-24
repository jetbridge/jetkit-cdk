export { JetKitCdkApp } from "./app";
export { CrudApi as CrudApiConstruct } from "./cdk/api/crud";
export { ResourceGenerator as ResourceGeneratorConstruct } from "./cdk/generator";
export { CrudApiBase } from "./api/crud";
export { ApiBase, APIEvent } from "./api/base";

export { CrudApi, Route, SubRoute, WrappableConstructor } from "./registry";
export {
  setMetadata,
  hasMemberMetadata,
  getMemberMetadata,
  setMemberMetadata,
  getMetadataKeys,
  getSubRouteMetadata,
  getCrudApiMetadata,
  setCrudApiMetadata,
  MetadataTarget,
} from "./metadata";

// convient CDK utilities to have
export { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2";
export { Duration } from "@aws-cdk/core";

// breaking API change version
export const JETKIT_VERSION_MAJOR = 0;
