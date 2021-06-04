import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2"
import * as rds from "@aws-cdk/aws-rds"
import * as core from "@aws-cdk/core"

export const DB_NAME = "lemmy"

interface ILemmyAppProps {
  vpc: Vpc
  securityGroups?: SecurityGroup[]
}

export class Database extends core.Construct {
  cluster: rds.ServerlessCluster
  securityGroup: SecurityGroup

  constructor(scope: core.Construct, id: string, { vpc, securityGroups }: ILemmyAppProps) {
    super(scope, id)

    this.securityGroup = new SecurityGroup(this, "DBSecurityGroup", {
      vpc,
      description: "Database ingress",
    })

    securityGroups ||= []

    this.cluster = new rds.ServerlessCluster(this, "LemmyCluster", {
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, "ParameterGroup", "default.aurora-postgresql10"),
      defaultDatabaseName: DB_NAME,
      vpc,
      securityGroups,
      clusterIdentifier: "lemmy",
      scaling: {
        minCapacity: 2,
        maxCapacity: siteConfig.dbMaxCapacity,
        autoPause: core.Duration.hours(siteConfig.dbSleepHours),
      },
    })
  }
}
