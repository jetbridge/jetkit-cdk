/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Wrappers for getting/setting metadata on classes and class properties

import { ApiView, RequestHandler } from "./api/base";
import { WrappableConstructor, WrappedConstructor } from "./registry";
import { BaseModel } from "./database/baseModel";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

const JK_V2_METADATA_KEY = Symbol.for("jk:v2:metadata");

// metadata map keys
export const JK_V2_METADATA_CRUD_API_KEY = Symbol.for(
  "jk:v2:metadata:crud:api"
);
// sub-route method inside a class
export const JK_V2_METADATA_SUBROUTES_KEY = Symbol.for(
  "jk:v2:metadata:subroutes"
);
// standalone function-level route
export const JK_V2_METADATA_ROUTE_KEY = Symbol.for("jk:v2:metadata:route");

export type ApiMetadataMap<V extends IApiMetadata> = Map<string, V>;

// what types of objects can have metadata attached?
export type MetadataTarget = WrappedConstructor | RequestHandler | ApiView;

export interface IApiMetadata extends NodejsFunctionProps {
  path: string;
  entry?: string;
  methods?: HttpMethod[];
}

export interface IFunctionMetadata extends IApiMetadata {
  requestHandlerFunc: RequestHandler;
}

export interface ICrudApiMetadata extends IApiMetadata {
  model?: typeof BaseModel; // TODO: make not optional
  apiClass: WrappableConstructor;
}

export interface ISubRouteApiMetadata extends IApiMetadata {
  propertyKey: string;
  requestHandlerFunc?: RequestHandler;
}

/// getters/setters

export const setMetadata = <T extends MetadataTarget>(cls: T, value: any) =>
  Reflect.defineMetadata(JK_V2_METADATA_KEY, value, cls);

// get/set our JKv2 metadata properties on a target
export const hasMemberMetadata = (
  cls: MetadataTarget,
  propertyKey: string | symbol
): cls is MetadataTarget =>
  Reflect.hasMetadata(JK_V2_METADATA_KEY, cls, propertyKey);

export const getMemberMetadata = <V>(
  target: MetadataTarget,
  propertyKey: string | symbol
): V | undefined =>
  Reflect.getMetadata(JK_V2_METADATA_KEY, target, propertyKey);

export const setMemberMetadata = (
  target: MetadataTarget,
  propertyKey: string | symbol,
  value: any
) => Reflect.defineMetadata(JK_V2_METADATA_KEY, value, target, propertyKey);

export const getMetadataKeys = (target: MetadataTarget, key: string | symbol) =>
  Reflect.getOwnMetadataKeys(target, key);

// CRUD API
export const hasCrudApiMetadata = (
  cls: MetadataTarget
): cls is MetadataTarget => hasMemberMetadata(cls, JK_V2_METADATA_CRUD_API_KEY);
export const getCrudApiMetadata = (
  cls: MetadataTarget
): ICrudApiMetadata | undefined =>
  getMemberMetadata(cls, JK_V2_METADATA_CRUD_API_KEY);
export const setCrudApiMetadata = (
  cls: MetadataTarget,
  value: ICrudApiMetadata
) => setMemberMetadata(cls, JK_V2_METADATA_CRUD_API_KEY, value);

// sub-routes
export const getSubRouteMetadata = (
  target: MetadataTarget
): ApiMetadataMap<ISubRouteApiMetadata> =>
  getMemberMetadata(target, JK_V2_METADATA_SUBROUTES_KEY) || new Map();
export const setSubRouteMetadata = (
  target: MetadataTarget,
  value: ApiMetadataMap<ISubRouteApiMetadata>
) => setMemberMetadata(target, JK_V2_METADATA_SUBROUTES_KEY, value);

// plain function route
export const getRouteMetadata = (
  target: RequestHandler
): IFunctionMetadata | undefined =>
  getMemberMetadata(target, JK_V2_METADATA_ROUTE_KEY);
export const setRouteMetadata = (
  target: RequestHandler,
  value: IFunctionMetadata
) => setMemberMetadata(target, JK_V2_METADATA_ROUTE_KEY, value);
