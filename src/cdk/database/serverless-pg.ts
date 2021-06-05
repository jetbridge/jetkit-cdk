import { SecurityGroup, Vpc, IVpc } from "@aws-cdk/aws-ec2"
import {
  AuroraCapacityUnit,
  DatabaseClusterEngine,
  ParameterGroup,
  ServerlessCluster,
  ServerlessClusterProps,
} from "@aws-cdk/aws-rds"
import * as core from "@aws-cdk/core"
import { Duration } from "@aws-cdk/core"
import { DatabaseSecret } from "./secret"

interface SlsPgDbProps {
  // name of db cluster
  clusterIdentifier: string

  // database name, defaults to `clusterIdentifier`
  dbName?: string

  // optional; will be created if not specified
  vpc?: Vpc

  // enables the DB to go to sleep if not active
  autoPause?: Duration

  // increase this if you don't mind paying a lot of money
  maxCapacity?: AuroraCapacityUnit
}

/**
 * Quickest and easiest way to get a Postgres database.
 * Uses Aurora Serverless.
 * Generates secret.
 * Recommend to use with https://www.npmjs.com/package/typeorm-aurora-data-api-driver
 */
export class SlsPgDb extends core.Construct {
  cluster: ServerlessCluster
  securityGroup: SecurityGroup
  vpc: IVpc
  dbName: string
  secret: DatabaseSecret

  constructor(
    scope: core.Construct,
    id: string,
    { vpc, maxCapacity, autoPause, clusterIdentifier, dbName }: SlsPgDbProps
  ) {
    super(scope, id)

    // if not VPC provided we'll create one just for the DB
    // how do you reach it? aurora data api
    if (!vpc) {
      vpc = new Vpc(this, `VPC`, {
        natGateways: 0,
      })
    }

    this.vpc = vpc as IVpc // idk why needed
    this.dbName = dbName || clusterIdentifier.toLowerCase()
    this.securityGroup = new SecurityGroup(this, "DBSecurityGroup", {
      vpc: this.vpc,
      description: "Database ingress",
    })
    this.secret = new DatabaseSecret(this, "Secret")

    const pause = autoPause ? { autoPause } : {}
    const scaling: ServerlessClusterProps["scaling"] = {
      minCapacity: 2, // this is the minimum
      maxCapacity: maxCapacity || AuroraCapacityUnit.ACU_2,
      ...pause,
    }

    this.cluster = new ServerlessCluster(this, "Cluster", {
      engine: DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: ParameterGroup.fromParameterGroupName(this, "ParameterGroup", "default.aurora-postgresql10"),
      defaultDatabaseName: this.dbName,
      vpc: this.vpc,
      securityGroups: [this.securityGroup],
      clusterIdentifier,
      scaling,
    })
  }
}

/**
 * Generate a database connection string (DSN).
 */
export const makeDatabaseUrl = (db: SlsPgDb) => {
  const dbUsername = db.cluster.secret?.secretValueFromJson("username")
  const dbPassword = db.cluster.secret?.secretValueFromJson("password")

  return "postgresql://" + `${dbUsername}:${dbPassword}@${db.cluster.clusterEndpoint.hostname}/` + db.dbName
}
