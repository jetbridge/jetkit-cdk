import "@aws-cdk/assert/jest"
import { Vpc } from "@aws-cdk/aws-ec2"
import { ParameterGroup } from "@aws-cdk/aws-rds"
import { Stack } from "@aws-cdk/core"
import { SlsPgDb } from "./serverless-pg"

describe("SlsPgDb", () => {
  const stack = new Stack()
  const vpc = new Vpc(stack, "VPC", {})
  const db = new SlsPgDb(stack, "DB", {
    vpc: vpc as any,
    parameterGroup: ParameterGroup.fromParameterGroupName(stack, "ParameterGroup", "default.aurora-postgresql10"),
    defaultDatabaseName: "foo",
  })

  it("creates the cluster", () => {
    // should have routes
    expect(stack).toHaveResource("AWS::RDS::DBCluster", {
      Engine: "aurora-postgresql",
      DatabaseName: "foo",
      DBClusterParameterGroupName: "default.aurora-postgresql10",
      DBSubnetGroupName: {
        Ref: "DBSubnets7B70DA43",
      },
      EngineMode: "serverless",
    })
  })

  it("generates DSN", () => {
    expect(db.makeDatabaseUrl()).toMatch(
      /postgresql:\/\/\$\{Token\[TOKEN.\d+\]}:\$\{Token\[TOKEN.\d+\]\}@\$\{Token\[TOKEN.\d+\]\}\/foo/
    )
  })
})
