import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager"
import { PrismaClient } from "@prisma/client"
import { DB_SECRET_ENV } from ".."

// running local dev?
const IS_SAM_LOCAL = process.env.SAM_LOCAL || process.env.AWS_ACCOUNT_ID === "123456789012"

const secretsClient = new SecretsManagerClient({})

// cached client
export let _prisma: PrismaClient

/**
 * Get database client.
 * Lazily creates client.
 */
type PrismaClientImpl = { new (...args: any[]): PrismaClient }
export const getPrismaClient = async <T extends PrismaClientImpl>(clientClass: T) => {
  if (_prisma) return _prisma

  // load connection URL from secrets if available
  if (process.env.DB_SECRET_ENV && !IS_SAM_LOCAL) {
    const url = await getDatabaseUrl()
    console.log("URL", url)
    process.env.DATABASE_URL = url
    _prisma = new clientClass({ datasources: { db: { url } } })
  } else {
    // load from schema.prisma - DATABASE_URL env var
    _prisma = new clientClass()
  }

  return _prisma
}

/**
 * Load DB URL from secrets manager.
 */
export async function getDatabaseUrl(): Promise<string> {
  // if we're in lambda and trying to connect to the DB
  // we should be able to load the DB secret
  const dbSecretArn = process.env[DB_SECRET_ENV]
  if (!dbSecretArn) throw new Error(`Trying to access database in Lambda but ${DB_SECRET_ENV} is not defined`)

  // load secret and build DATABASE_URL
  let dbSecret
  try {
    dbSecret = await getSecret(dbSecretArn)
  } catch (e) {
    console.error(`Failed to load database secret ${DB_SECRET_ENV}`)
    throw e
  }
  if (!dbSecret) throw new Error(`Failed to load database secret ${DB_SECRET_ENV}`)
  return databaseSecretToUrl(dbSecret)
}

function databaseSecretToUrl(secret: Record<string, string>): string {
  const { dbname, engine, port, host, username, password } = secret
  return [`${engine}:/`, `${username}:${password}@${host}:${port}`, dbname].join("/")
}

// move me
async function getSecret(secretArn: string): Promise<Record<string, string> | undefined> {
  const getCmd = new GetSecretValueCommand({ SecretId: secretArn })
  const res = await secretsClient.send(getCmd)
  if (!res.SecretString) return undefined
  return JSON.parse(res.SecretString)
}
