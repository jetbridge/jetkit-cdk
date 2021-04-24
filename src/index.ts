// app
export { JetKitCdkApp } from "./app";

// cdk
export { CrudApi as CrudApiConstruct } from "./cdk/api/crud";
export { ResourceGenerator as ResourceGeneratorConstruct } from "./cdk/generator";
// convient CDK utilities to have
export { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2";
export { Duration } from "@aws-cdk/core";

// api
export { CrudApiView } from "./api/crud/base";
export { ApiView, APIEvent } from "./api/base";

// metadata
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

// database
export { BaseModel } from "./database/baseModel";

// breaking API change version
export const JETKIT_VERSION_MAJOR = 0;
