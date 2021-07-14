import { Construct } from "@aws-cdk/core"
import { DatabaseFuncProps, PrismaNode14Func } from "../../node14func"

export interface ScriptProps extends DatabaseFuncProps {
  /**
   * Path to prisma directory containing schema and migrations.
   */
  prismaPath: string
}

/**
 * Lambda function to run database migrations.
 *
 * @category Construct
 */
export class DatabaseMigrationFunction extends PrismaNode14Func {
  constructor(
    scope: Construct,
    id: string,
    { handler, depsLockFilePath, prismaPath, bundling, memorySize = 512, ...props }: ScriptProps
  ) {
    bundling ||= {}

    // by default this uses migration.script.ts
    handler ||= "script"

    depsLockFilePath ||= `${__dirname}/package-lock.json`

    if (bundling.commandHooks)
      throw new Error("Sorry you cannot define commandHooks on the migration script")

      // add prisma dir with migrations
    ;(bundling as any).commandHooks = {
      beforeInstall: (): string[] => [],
      afterBundling: (): string[] => [],
      beforeBundling: (_inputDir: string, outputDir: string): string[] => {
        return [
          // need to copy over migration files
          `cp -r "${prismaPath}" "${outputDir}"`,
        ]
      },
    }

    super(scope, id, { ...props, bundling, memorySize, depsLockFilePath, handler })

    // TODO
    // new CfnOutput(this, "Invoke migrations", {
    // value: "aws lambda invoke .....",
    // })
  }
}
