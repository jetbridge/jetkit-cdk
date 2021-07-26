import { stringLike } from "@aws-cdk/assert"
import "@aws-cdk/assert/jest"
import { Vpc } from "@aws-cdk/aws-ec2"
import { ParameterGroup } from "@aws-cdk/aws-rds"
import { Stack } from "@aws-cdk/core"
import { PRISMA_PG_LAYER_VERSION, SlsPgDb } from "../../../database/serverless-pg"
import { DatabaseMigrationScript } from "./migration"

describe("DatabaseMigrationScript", () => {
  let stack: Stack

  beforeEach(() => {
    stack = new Stack()
    const vpc = new Vpc(stack, "vpc")
    const db = new SlsPgDb(stack, "db", {
      vpc,
      parameterGroup: ParameterGroup.fromParameterGroupName(stack, "ParameterGroup", "default.aurora-postgresql11"),
    })
    new DatabaseMigrationScript(stack, "func", {
      db,
      vpc,
      prismaPath: `src/test`,
      entry: `${__dirname}/../../../../test/emptyHandler.js`,
    })
  })

  it("creates migration script", () => {
    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          NODE_OPTIONS: "--enable-source-maps",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          DB_SECRET_ARN: {
            Ref: stringLike("dbSecretAttachment*"),
          },
          DATABASE_URL: {
            "Fn::Join": [
              "",
              [
                "postgresql://{{resolve:secretsmanager:",
                {
                  Ref: stringLike("dbSecretAttachment*"),
                },
                ":SecretString:username::}}:{{resolve:secretsmanager:",
                {
                  Ref: stringLike("dbSecretAttachment*"),
                },
                ":SecretString:password::}}@",
                {
                  "Fn::GetAtt": [stringLike("db*"), "Endpoint.Address"],
                },
                "/",
              ],
            ],
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
              `898466741470:layer:PrismaPg:${PRISMA_PG_LAYER_VERSION}`,
            ],
          ],
        },
      ],
      MemorySize: 512,
      Runtime: "nodejs14.x",
      VpcConfig: {
        SecurityGroupIds: [
          {
            "Fn::GetAtt": [stringLike("funcSecurityGroup*"), "GroupId"],
          },
        ],
        SubnetIds: [
          {
            Ref: stringLike("vpcPrivateSubnet*"),
          },
          {
            Ref: stringLike("vpcPrivateSubnet*"),
          },
        ],
      },
    })
  })
})
