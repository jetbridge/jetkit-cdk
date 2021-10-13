import { CfnOutput, Construct, Duration } from "@aws-cdk/core"
import { DatabaseFuncProps, PrismaNode14Func } from "../../prismaNodeFunction"

type ScriptProps = DatabaseFuncProps

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
  constructor(scope: Construct, id: string, { entry, timeout, memorySize = 512, ...props }: ScriptProps) {
    // by default this uses migration.script.ts
    entry ||= `./migration.script.js` // it will have been already transpiled to js

    timeout ||= Duration.seconds(120)

    super(scope, id, {
      ...props,
      entry,
      memorySize,
      timeout,
    })

    new CfnOutput(this, "MigrationScriptArn", {
      value: this.functionArn,
    })
  }
}
