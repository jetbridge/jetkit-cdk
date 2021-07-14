import "@aws-cdk/assert/jest"
import { Vpc } from "@aws-cdk/aws-ec2"
import { ParameterGroup } from "@aws-cdk/aws-rds"
import { Stack } from "@aws-cdk/core"
import { SlsPgDb } from "../../../database/serverless-pg"
import { DatabaseMigrationScript } from "./migration"

describe("DatabaseMigrationScript", () => {
  let stack: Stack
  let script: DatabaseMigrationScript

  beforeEach(() => {
    stack = new Stack()
    const vpc = new Vpc(stack, "vpc")
    const db = new SlsPgDb(stack, "db", {
      vpc,
      parameterGroup: ParameterGroup.fromParameterGroupName(stack, "ParameterGroup", "default.aurora-postgresql11"),
    })
    script = new DatabaseMigrationScript(stack, "func", {
      db,
      vpc,
      prismaPath: "./",
      // defaults to .js for packaged module
      entry: `${__dirname}/migration.script.ts`,
    })
  })

  it("creates migration script", () => {
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          NODE_OPTIONS: "--enable-source-maps",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          DB_SECRET_ARN: {
            Ref: "dbSecretAttachment5D338442",
          },
        },
      },
      Handler: "index.handler",
      Layers: [
        {
          "Fn::Join": [
            ":",
            [
              "arn:aws:lambda",
              {
                Ref: "AWS::Region",
              },
              "898466741470:layer:PrismaPg:8",
            ],
          ],
        },
      ],
      MemorySize: 512,
      Runtime: "nodejs14.x",
      VpcConfig: {
        SecurityGroupIds: [
          {
            "Fn::GetAtt": ["funcSecurityGroup1E2AAB7C", "GroupId"],
          },
        ],
        SubnetIds: [
          {
            Ref: "vpcPrivateSubnet1Subnet934893E8",
          },
          {
            Ref: "vpcPrivateSubnet2Subnet7031C2BA",
          },
        ],
      },
    })
  })
})
