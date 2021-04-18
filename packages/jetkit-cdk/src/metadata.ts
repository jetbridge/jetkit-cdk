/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Wrappers for getting/setting metadata on classes and class properties

import { ApiBase, RequestHandler } from "./api/base";
import { WrappableConstructor, WrappedConstructor } from "./registry";
import { BaseModel } from "demo-repo";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export const JK_V2_METADATA_KEY = "jk:v2:metadata";

// what types of objects can have metadata attached?
export type MetadataTarget =
  | WrappedConstructor
  | RequestHandler
  | ApiBase
  | Function;

export interface IApiMetadata extends NodejsFunctionProps {
  path: string;
  entry?: string;
  requestHandlerFunc?: RequestHandler;
  methods?: HttpMethod[];
}

export interface ICrudApiMetadata extends IApiMetadata {
  model?: typeof BaseModel; // TODO: make not optional
  apiClass: WrappableConstructor;
}

export interface ISubRouteApiMetadata extends IApiMetadata {
  propertyKey: string;
}

/// getters/setters

export const hasJKMetadata = (cls: MetadataTarget): cls is MetadataTarget =>
  Reflect.hasMetadata(JK_V2_METADATA_KEY, cls);

export const hasJKMemberMetadata = (
  cls: MetadataTarget,
  propertyKey: string | symbol
): cls is MetadataTarget =>
  Reflect.hasMetadata(propertyKey, cls, JK_V2_METADATA_KEY);

export const getJKMetadata = <T extends MetadataTarget>(
  cls: T
): ICrudApiMetadata => Reflect.getMetadata(JK_V2_METADATA_KEY, cls);

export const getJKMemberMetadata = <T extends MetadataTarget>(
  cls: T,
  propertyKey: string | symbol
): ISubRouteApiMetadata | undefined =>
  Reflect.getMetadata(propertyKey, cls, JK_V2_METADATA_KEY);
// I think this  ^  is wrong and should be  v
// Reflect.getMetadata(JK_V2_METADATA_KEY, cls, propertyKey);
// but it doesn't work

export const setJKMetadata = <T extends MetadataTarget>(cls: T, value: any) =>
  Reflect.defineMetadata(JK_V2_METADATA_KEY, value, cls);

export const setJKMemberMetadata = <T extends MetadataTarget>(
  cls: T,
  propertyKey: string | symbol,
  value: any
  // ) => Reflect.defineMetadata(JK_V2_METADATA_KEY, value, cls, propertyKey);
) => Reflect.defineMetadata(propertyKey, value, cls, JK_V2_METADATA_KEY);

export const getJKMetadataKeys = (cls: any) =>
  Reflect.getOwnMetadataKeys(cls, JK_V2_METADATA_KEY);

export const enumerateMetadata = (resources: MetadataTarget[]) =>
  resources.map((resource) => {
    if (!hasJKMetadata(resource)) {
      throw new Error(
        `Did not find metadata on ${resource}, did you decorate it with @CrudApi?`
      );
    }

    const meta = getJKMetadata(resource);
    return { meta, resource };
  });

export const enumerateMethodMetadata = (target: MetadataTarget) =>
  getJKMetadataKeys(target).map((k) => {
    if (!hasJKMemberMetadata(target, k))
      throw new Error(`Failed to find ${k} in metadata for ${target}`);

    const meta = getJKMemberMetadata(target, k);
    if (!meta) throw new Error(`Failed to find metadata for ${k} in ${target}`);

    return meta;
  });
