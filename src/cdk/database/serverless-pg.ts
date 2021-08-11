import { DatabaseClusterEngine, IClusterEngine, ServerlessCluster, ServerlessClusterProps } from "@aws-cdk/aws-rds"
import * as core from "@aws-cdk/core"
import { IVpc } from "@aws-cdk/aws-ec2"

export interface SlsPgDbProps extends Omit<ServerlessClusterProps, "engine"> {
  engine?: IClusterEngine

  /**
   * Number of connections each prisma client can maintain.
   * Tradeoff of lambdas using up connections vs. query parallelization.
   * https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#serverless-environments-faas
   */
  prismaConnectionLimit?: number
}

/**
 * Quickest and easiest way to get a Postgres database.
 * Uses Aurora Serverless.
 * Generates secret.
 * and https://docs.aws.amazon.com/cdk/api/latest/docs/aws-rds-readme.html#data-api
 */
export class SlsPgDb extends ServerlessCluster {
  defaultDatabaseName?: string
  prismaConnectionLimit?: number

  // it's private in ServerlessCluster for some reason?
  vpc_: IVpc

  constructor(
    scope: core.Construct,
    id: string,
    {
      defaultDatabaseName,
      engine = DatabaseClusterEngine.AURORA_POSTGRESQL,
      prismaConnectionLimit,
      ...props
    }: SlsPgDbProps
  ) {
    const superProps: ServerlessClusterProps = {
      engine,
      defaultDatabaseName,
      ...props,
    }
    super(scope, id, superProps)

    // save
    this.defaultDatabaseName = defaultDatabaseName
    this.vpc_ = props.vpc
    this.prismaConnectionLimit = prismaConnectionLimit
  }

  /**
   * Generate a database connection string (DSN).
   */
  makeDatabaseUrl() {
    const dbUsername = this.secret?.secretValueFromJson("username")
    const dbPassword = this.secret?.secretValueFromJson("password")

    let url =
      "postgresql://" +
      `${dbUsername}:${dbPassword}@${this.clusterEndpoint.hostname}/` +
      // TODO: how to get db name if not explicitly provided?
      (this.defaultDatabaseName || "")

    if (this.prismaConnectionLimit) url += `?connection_limit=${this.prismaConnectionLimit}`

    return url
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
