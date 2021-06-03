import { App as CdkApp } from "aws-cdk-lib"
import { IConfig } from "./config"

export interface IAppProps<ConfigT extends IConfig> {
  // Presently unused
  config?: ConfigT
}

/**
 * Your CDK application.
 *
 * Does nothing at present.
 */
export class JetKitCdkApp<ConfigT extends IConfig> extends CdkApp {
  config: ConfigT

  constructor({ config }: IAppProps<ConfigT>) {
    super()

    // initialize app
    if (config) this.config = config
  }
}
