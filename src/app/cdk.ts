import { App as CdkApp } from "@aws-cdk/core"
import { IConfig } from "./config"

export interface IAppProps<ConfigT extends IConfig> {
  // Presently unused
  config?: ConfigT
}

/**
 * Your CDK application.
 *
 * You may provide a configuration to apply
 */
export class JetKitCdkApp<ConfigT extends IConfig> extends CdkApp {
  config?: ConfigT

  constructor({ config }: IAppProps<ConfigT>) {
    super()

    // initialize app
    this.config = config
  }
}
