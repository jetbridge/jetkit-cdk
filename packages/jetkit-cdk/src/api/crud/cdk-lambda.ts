// import { ICrudApi } from "./";
// import {
//   CrudApi as CdkCrudApi,
//   CrudApiProps as CdkCrudApiProps,
// } from "../../cdk/lib/crud-api";
// import { Construct } from "@aws-cdk/core";

// export interface ICdkLambdaCrudApiProps extends CdkCrudApiProps {
//   apiName?: string;
//   scope: Construct;
//   id?: string;
// }

// /**
//  * Define CRUD for resources using CDK, api-gateway-v2, nodeJS, and lambda.
//  */
// export class CdkLambdaCrudApi implements ICrudApi {
//   private crudApi: CdkCrudApi;

//   constructor(props: ICdkLambdaCrudApiProps) {
//     let { apiName, scope, id, ...rest } = props;

//     if (!id) {
//       if (apiName) id = `CrudApi-${apiName}`;
//       else id = "CrudApi";
//     }
//     this.crudApi = new CdkCrudApi(scope, id, { apiName, ...rest });
//   }

//   addChildRoute(path: string): ICrudApi {
//     throw new Error("Method not implemented.");
//   }
// }

export default "hi";
