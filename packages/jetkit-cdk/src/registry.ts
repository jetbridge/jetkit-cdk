import { CrudApiBase } from "./api/crud";
import { BaseModel } from "demo-repo";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";

export function registerCrudApi(reg: ICrudApiRegistry) {
  resourceRegistry.crudApis.push(reg);
}

export interface Registerable {
  registryId: symbol;
}

export function findCrudApiInRegistry(
  api: CrudApiConstructor
): ICrudApiRegistry | undefined {
  return resourceRegistry.crudApis.find((reg) => api == reg.apiClass);
}

export interface ICrudApiRegistry extends NodejsFunctionProps {
  route: string;
  model: typeof BaseModel;
  apiClass: CrudApiConstructor;
}

interface IResourceRegistry {
  crudApis: ICrudApiRegistry[];
}

export const resourceRegistry: IResourceRegistry = {
  crudApis: [],
};

interface CrudApiConstructor {
  new (...args: any[]): CrudApiBase;
}

export function RegisterCrudApi(opts: Omit<ICrudApiRegistry, "apiClass">) {
  return function <T extends CrudApiConstructor>(constructor: T) {
    resourceRegistry.crudApis.push({
      ...opts,
      apiClass: constructor,
    });
    return constructor;
  };
}
