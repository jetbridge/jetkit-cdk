import { CfnOutput, Construct, Duration } from "@aws-cdk/core"
import { DatabaseFuncProps, PrismaNode14Func } from "../../prismaNodeFunction"

export type ScriptProps = DatabaseFuncProps

/**
 * Lambda function to run database migrations.
 *
 * @category Construct
 *
 * @example
 * ```ts
 * new DatabaseMigrationScript(this, "MigrationScript", {
 *    vpc,
 *    db,
 *    functionName: `${id}-migrate`,
 *    prismaPath: 'path/to/prisma',
 *    bundling: {
 *      externalModules: prismaLayer.externalModules,
 *    },
 *    layers: [prismaLayer],
 * })
 * ```
 */
export class DatabaseMigrationScript extends PrismaNode14Func {
  constructor(
    scope: Construct,
    id: string,
    { handler, depsLockFilePath, environment, entry, timeout, bundling, memorySize = 512, ...props }: ScriptProps
  ) {
    // by default this uses migration.script.ts
    entry ||= `${__dirname}/migration.script.js` // it will have been already compiled

    timeout ||= Duration.seconds(120)
    bundling ||= {}

    let { nodeModules, ...bundlingRest } = bundling
    // only works as actual files - can't be bundled
    // https://github.com/prisma/prisma/issues/8337#issuecomment-895380661
    nodeModules ||= []
    nodeModules.push("@prisma/migrate", "@prisma/sdk")

    environment ||= {}
    // environment.PRISMA_QUERY_ENGINE_LIBRARY =
    // "/opt/nodejs/node_modules/prisma/libquery_engine-rhel-openssl-1.0.x.so.node"

    super(scope, id, {
      ...props,
      environment,
      entry,
      memorySize,
      depsLockFilePath,
      timeout,
      handler,
      bundling: {
        nodeModules,
        ...bundlingRest,
      },
    })

    new CfnOutput(this, "MigrationScriptArn", {
      value: this.functionArn,
    })
  }
}
