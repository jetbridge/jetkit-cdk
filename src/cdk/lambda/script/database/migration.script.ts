import { Migrate } from "@prisma/migrate"
import { ensureDatabaseExists } from "@prisma/migrate/dist/utils/ensureDatabaseExists"
import { printFilesFromMigrationIds } from "@prisma/migrate/dist/utils/printFiles"
import chalk from "chalk"
import { getDatabaseUrl } from "../../../../database/prismaClient"

export const handler = async (): Promise<string> => {
  // load DB URL from secrets
  if (!process.env.DATABASE_URL) {
    const dbUrl = await getDatabaseUrl()
    process.env.DATABASE_URL = dbUrl
  }

  const schemaPath = "./prisma/schema.prisma"

  const migrate = new Migrate()
  const wasDbCreated = await ensureDatabaseExists("apply", true, schemaPath)
  if (wasDbCreated) {
    console.info() // empty line
    console.info(wasDbCreated)
  }

  const diagnoseResult = await migrate.diagnoseMigrationHistory({
    optInToShadowDatabase: false,
  })
  const listMigrationDirectoriesResult = await migrate.listMigrationDirectories()

  if (listMigrationDirectoriesResult.migrations.length > 0) {
    const migrations = listMigrationDirectoriesResult.migrations
    console.info(`${migrations.length} migration${migrations.length > 1 ? "s" : ""} found in prisma/migrations`)
  } else {
    console.info(`No migration found in prisma/migrations`)
  }

  const editedMigrationNames = diagnoseResult.editedMigrationNames
  if (editedMigrationNames.length > 0) {
    console.info(
      `${chalk.yellow("WARNING The following migrations have been modified since they were applied:")}
${editedMigrationNames.join("\n")}`
    )
  }

  const { appliedMigrationNames: migrationIds } = await migrate.applyMigrations()

  migrate.stop()

  console.info() // empty line
  if (migrationIds.length === 0) {
    return chalk.greenBright(`No pending migrations to apply.`)
  } else {
    return `The following migration${migrationIds.length > 1 ? "s" : ""} have been applied:\n\n${chalk(
      printFilesFromMigrationIds("migrations", migrationIds, {
        "migration.sql": "",
      })
    )}

${chalk.greenBright("All migrations have been successfully applied.")}`
  }
}
