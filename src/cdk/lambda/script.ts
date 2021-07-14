import { Vpc } from "@aws-cdk/aws-ec2"
import { Runtime } from "@aws-cdk/aws-lambda"
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs"
import { CfnOutput, Construct, Duration } from "@aws-cdk/core"
import { SlsPgDb } from "../database/serverless-pg"
import { DB_SECRET_ENV } from "../generator"

/**
 *
 * @module
 */

export interface ScriptProps {
  vpc: Vpc
  db: SlsPgDb
}

/**
 * Construct to generate an invokable lambda utility script.
 *
 * Can be used for any commands you want to run in AWS.
 * E.g. run migratiions, seed DB, etc..
 */
export class Script extends Construct {
  constructor(scope: Construct, id: string, { vpc, db }: ScriptProps) {
    super(scope, id)

    // migrate script
    const func = new NodejsFunction(this, "migrate", {
      timeout: Duration.seconds(60), // todo: config
      memorySize: 1024,
      layers: [db.getPrismaLayerVersion()],
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
      runtime: Runtime.NODEJS_14_X,
      bundling: {
        externalModules: db.getExternalModules(),
        // minify: true,
        commandHooks: {
          beforeInstall: () => [],
          afterBundling: () => [],
          beforeBundling: (_inputDir: string, outputDir: string): string[] => {
            return [
              // need to copy over migration files
              `cp -r "${__dirname}/../../../repo/prisma" "${outputDir}"`,
            ]
          },
        },
      },
      vpc,
    })

    // allow DB access
    db.connections.allowDefaultPortFrom(func)
    if (db.secret) {
      func.addEnvironment(DB_SECRET_ENV, db.secret.secretArn)
      db.secret.grantRead(func)
    }

    // TODO
    // new CfnOutput(this, "Invoke migrations", {
    // value: "aws lambda invoke .....",
    // })
  }
}
