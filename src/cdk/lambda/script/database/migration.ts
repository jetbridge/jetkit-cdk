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
 *      externalModules: appLayer.externalModules,
 *    },
 *    layers: [appLayer],
 *  })
 * ```
 */
export class DatabaseMigrationScript extends PrismaNode14Func {
  constructor(
    scope: Construct,
    id: string,
    { handler, depsLockFilePath, entry, timeout, bundling, memorySize = 512, ...props }: ScriptProps
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

    super(scope, id, {
      ...props,
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
