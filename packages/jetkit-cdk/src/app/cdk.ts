import {
  CorsPreflightOptions,
  CorsHttpMethod,
} from "@aws-cdk/aws-apigatewayv2";
import { App as CdkApp } from "@aws-cdk/core";

export interface IAppProps {
  config?: IAppConfig;
}

export interface IAppConfig {
  api: {
    corsPreflight?: CorsPreflightOptions;
  };
}

/**
 * Top-level application context/god object.
 *
 * I'm thinking this could contain really basic framework
 * utilities like configuration and logging.
 */
export class JetKitCdkApp extends CdkApp {
  config: IAppConfig;

  constructor({ config }: IAppProps) {
    super();

    if (config) this.config = config;
  }
}

export { CorsPreflightOptions, CorsHttpMethod };
