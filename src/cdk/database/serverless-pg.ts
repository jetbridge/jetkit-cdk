import { DatabaseClusterEngine, IClusterEngine, ServerlessCluster, ServerlessClusterProps } from "@aws-cdk/aws-rds"
import * as core from "@aws-cdk/core"

export interface SlsPgDbProps extends Omit<ServerlessClusterProps, "engine"> {
  // default database name
  defaultDatabaseName?: string

  // forced to AURORA_POSTGRESQL
  engine?: never
}

/**
 * Quickest and easiest way to get a Postgres database.
 * Uses Aurora Serverless.
 * Generates secret.
 * Recommend to use with https://www.npmjs.com/package/typeorm-aurora-data-api-driver
 * and https://docs.aws.amazon.com/cdk/api/latest/docs/aws-rds-readme.html#data-api
 */
export class SlsPgDb extends ServerlessCluster {
  defaultDatabaseName?: string | undefined

  constructor(scope: core.Construct, id: string, { defaultDatabaseName, ...props }: SlsPgDbProps) {
    const superProps: ServerlessClusterProps = {
      // force engine
      engine: DatabaseClusterEngine.AURORA_POSTGRESQL,
      ...props,
    }
    if (defaultDatabaseName) (superProps as any).defaultDatabaseName = defaultDatabaseName
    super(scope, id, superProps)

    this.defaultDatabaseName = defaultDatabaseName
  }

  /**
   * Generate a database connection string (DSN).
   */
  makeDatabaseUrl() {
    const dbUsername = this.secret?.secretValueFromJson("username")
    const dbPassword = this.secret?.secretValueFromJson("password")

    return (
      "postgresql://" +
      `${dbUsername}:${dbPassword}@${this.clusterEndpoint.hostname}/` +
      // TODO: how to get db name if not explicitly provided?
      (this.defaultDatabaseName || "")
    )
  }

  /**
   * Get params for connecting via data API.
   * Make sure you set enableDataApi: true
   * or call grantDataApiAccess()
   */
  getDataApiParams() {
    if (!this.secret) throw new Error("cluster missing secret")
    return {
      clusterArn: this.clusterArn,
      secretArn: this.secret.secretArn,
    }
  }
}
