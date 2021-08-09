import { CfnOutput, Construct, Duration } from "@aws-cdk/core"
import { DatabaseFuncProps, PrismaNode14Func } from "../../prismaNodeFunction"

export type ScriptProps = DatabaseFuncProps

/**
 * Lambda function to run database migrations.
 *
 * @category Construct
 */
export class DatabaseMigrationScript extends PrismaNode14Func {
  constructor(
    scope: Construct,
    id: string,
    { handler, depsLockFilePath, entry, timeout, memorySize = 512, ...props }: ScriptProps
  ) {
    // by default this uses migration.script.ts
    entry ||= `${__dirname}/migration.script.js` // already compiled

    timeout ||= Duration.seconds(120)

    super(scope, id, { ...props, entry, memorySize, depsLockFilePath, timeout, handler })

    new CfnOutput(this, "MigrationScriptArn", {
      value: this.functionArn,
    })
  }
}
