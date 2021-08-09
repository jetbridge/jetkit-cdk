import { Vpc } from "@aws-cdk/aws-ec2"
import { Construct } from "@aws-cdk/core"
import { DB_SECRET_ENV, Node14Func, Node14FuncProps, SlsPgDb } from "../.."
import { DB_URL_ENV } from "../generator"

export interface DatabaseFuncProps extends Node14FuncProps {
  vpc: Vpc
  db: SlsPgDb

  /**
   * Path to prisma directory containing schema and migrations.
   */
  prismaPath: string
}

/**
 * Lambda function with database access.
 * Grants access to DB and secret.
 * To use be sure to provide bundling.layer = [appLayer] and externalModules = appLayer.externalModules.
 * @alpha
 */
export class PrismaNode14Func extends Node14Func {
  constructor(scope: Construct, id: string, { db, vpc, bundling, prismaPath, ...props }: DatabaseFuncProps) {
    // add bundling command hooks
    bundling ||= {}
    let { commandHooks, ...bundlingRest } = bundling
    if (commandHooks) throw new Error("Cannot specify commandHooks")
    commandHooks = {
      beforeInstall: (): string[] => [],
      afterBundling: (_inputDir: string, outputDir: string): string[] => [
        `rm -rf ${outputDir}/package-lock.json`,
        // don't need these - get from layer
        `rm -rf ${outputDir}/node_modules/@prisma/engines`,
        `rm -rf ${outputDir}/node_modules/@prisma/sdk/node_modules/@prisma/engines`,
        `rm -rf ${outputDir}/node_modules/@prisma/engine-core/node_modules/@prisma/engines`,
      ],
      beforeBundling: (inputDir: string, outputDir: string): string[] => [
        // need to copy over migration files
        `cp -r "${inputDir}/${prismaPath}" "${outputDir}"`,
      ],
    }

    super(scope, id, {
      bundling: { commandHooks, ...bundlingRest },
      vpc,
      ...props,
    })

    // allow DB access
    db.grantDataApiAccess(this)
    this.addEnvironment(DB_URL_ENV, db.makeDatabaseUrl())
    db.connections.allowDefaultPortFrom(this)
    if (db.secret) {
      this.addEnvironment(DB_SECRET_ENV, db.secret.secretArn)
      db.secret.grantRead(this)
    }
  }
}
