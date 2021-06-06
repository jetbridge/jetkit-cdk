import { IVpc, SecurityGroup, Vpc } from "@aws-cdk/aws-ec2"
import {
  DatabaseClusterEngine,
  IClusterEngine,
  ParameterGroup,
  ServerlessCluster,
  ServerlessClusterProps,
} from "@aws-cdk/aws-rds"
import * as core from "@aws-cdk/core"
import { DatabaseSecret } from "./secret"

interface SlsPgDbProps extends Omit<ServerlessClusterProps, "vpc" | "engine"> {
  // optional; will be created if not specified
  vpc?: IVpc

  // defaults to AURORA_POSTGRESQL
  engine?: IClusterEngine
}

/**
 * Quickest and easiest way to get a Postgres database.
 * Uses Aurora Serverless.
 * Generates secret.
 * Recommend to use with https://www.npmjs.com/package/typeorm-aurora-data-api-driver
 * and https://docs.aws.amazon.com/cdk/api/latest/docs/aws-rds-readme.html#data-api
 */
export class SlsPgDb extends ServerlessCluster {
  cluster: ServerlessCluster
  securityGroup?: SecurityGroup

  constructor(scope: core.Construct, id: string, { ...props }: SlsPgDbProps) {
        // if not VPC provided we'll create one just for the DB
    // how do you reach it? aurora data api
    if (!props.vpc) {
      props.vpc = new Vpc(this, `VPC`, {
        natGateways: 0,
      }) as IVpc // idk why needed
    }


    super(scope, id, props)


    // create a security group if none specified
    if (!props.securityGroups) {
      this.securityGroup = new SecurityGroup(this, "DBSecurityGroup", {
        vpc: props.vpc,
        description: "Database ingress",
      })
      props.securityGroups = [this.securityGroup]
    }

    // secret to connect
    this.secret = new DatabaseSecret(this, "Secret")

    const clusterProps: ServerlessClusterProps = {
      ...props,
      vpc: props.vpc,
      credentials: this.secret,
      engine: props.engine || DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: ParameterGroup.fromParameterGroupName(this, "ParameterGroup", "default.aurora-postgresql10"),
    }

    this.cluster = new ServerlessCluster(this, "Cluster", clusterProps)
  }

  /**
   * Generate a database connection string (DSN).
   */
  makeDatabaseUrl() {
    const dbUsername = this.cluster.secret?.secretValueFromJson("username")
    const dbPassword = this.cluster.secret?.secretValueFromJson("password")

    return "postgresql://" + `${dbUsername}:${dbPassword}@${this.cluster.clusterEndpoint.hostname}/` + this.
  }

  /**
   * Get params for connecting via data API
   */
  getDataApiAuth() {
    return {
      CLUSTER_ARN: this.cluster.clusterArn,
      SECRET_ARN: this.secret.secretArn,
    }
  }
}
