import { CorsPreflightOptions, HttpApi } from "@aws-cdk/aws-apigatewayv2";
import {
  App as CdkApp,
  AppProps,
  Construct,
  Stack,
  StackProps,
} from "@aws-cdk/core";
import { IApp } from ".";
// import { CdkLambdaCrudApi } from "../api/crud";

export interface IAppConfig {
  api: {
    corsPreflight?: CorsPreflightOptions;
  };
}

export class JetKitCdkApp extends CdkApp implements IApp {
  addCrudResource(): void {
    throw new Error("Method not implemented.");
  }
}
/**
 * JetKit CDK implementation
 */
// export class JetKitCdkApp extends CdkApp implements IApp {
//   cdkStack: Stack;
//   httpApi?: HttpApi;
//   crudApi?: CdkLambdaCrudApi;

//   constructor(props?: AppProps) {
//     super(props);

//     this.cdkStack = new CdkStack(this, "CdkStack", {});
//   }

//   addCrudResource() {
//     if (!this.httpApi) {
//       // const corsOptions =
//       this.httpApi = new HttpApi(this.cdkStack, "HttpApi", {
//         // corsPreflight,
//       });
//     }

//     if (!this.crudApi)
//       this.crudApi = new CdkLambdaCrudApi({
//         scope: this.cdkStack,
//         api: this.httpApi,
//       });

//     // this.crudApi.addChildRoute();
//   }
// }
