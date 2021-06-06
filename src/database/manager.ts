import { DB_CLUSTER_ENV, DB_NAME_ENV, DB_SECRET_ENV } from "../cdk/generator"
import { Connection, ConnectionManager, ConnectionOptions, createConnection, getConnectionManager } from "typeorm"
import { LoggerOptions } from "typeorm/logger/LoggerOptions"

// todo: maybe make connection names match DB names
// to support multiple connections to different databases
const CONNECTION_NAME = "default"

export interface ConnectionOptionsOverrides extends Omit<ConnectionOptions, "type"> {
  database: string

  printQueries?: boolean | undefined

  // enable x-ray instrumentation
  // (may be broken)
  tracing?: boolean | undefined
}

/**
 * Manager of database connections.
 * Needs some improvement. Consider it a work in progress.
 */
export class DatabaseManager {
  private readonly connectionManager: ConnectionManager
  entities: any[]

  constructor(entities: any[]) {
    this.entities = entities
    this.connectionManager = getConnectionManager()
  }

  /**
   *
   * @returns Database connection
   */
  public async getConnection(opts: ConnectionOptionsOverrides): Promise<Connection> {
    let connection: Connection

    if (this.connectionManager.has(CONNECTION_NAME)) {
      connection = await this.connectionManager.get(CONNECTION_NAME)

      if (!connection.isConnected) {
        connection = await connection.connect()
      }
    } else {
      const options = this.getConnectionOptions(opts)
      connection = await createConnection(options)
    }

    return connection
  }

  getConnectionOptions({ printQueries, tracing, ...opts }: ConnectionOptionsOverrides): ConnectionOptions {
    // config
    let connectionOptions: ConnectionOptions

    // logging
    const logging: LoggerOptions = ["error"]
    if (process.env.SQL_ECHO || printQueries) logging.push("query") // log queries

    opts.database ||= process.env[DB_NAME_ENV] || ""

    if (process.env.USE_LOCAL_DB) {
      console.debug("Using local database...")
      // local DB
      connectionOptions = {
        type: "postgres",
        entities: this.entities,
        port: 5432,
        host: process.env.DB_HOST || "",
        logging: logging,
        ...opts,
      }
    } else {
      // aurora sls
      // should have these provided automatically
      const clusterArn = process.env[DB_CLUSTER_ENV]
      const secretArn = process.env[DB_SECRET_ENV]
      const region = process.env["AWS_DEFAULT_REGION"]
      if (!clusterArn || !secretArn || !opts.database)
        throw new Error("Aurora data API credentials missing DB_CLUSTER_ENV/DB_SECRET_ENV/DB_NAME_ENV")
      if (!region) throw new Error("AWS_DEFAULT_REGION not defined")
      connectionOptions = {
        entities: this.entities,
        type: "aurora-data-api-pg",
        secretArn,
        resourceArn: clusterArn,
        region,
        logging: logging,
        name: CONNECTION_NAME,
        serviceConfigOptions: { logging },
        ...opts,
      }
    }

    // Don't need a pwd locally
    if (process.env.DB_PASSWORD) {
      Object.assign(connectionOptions, {
        password: process.env.DB_PASSWORD,
      })
    }

    if (tracing) this.configureTracing()

    return connectionOptions
  }

  // instrument queries with xray
  // TODO: change to xray/opentelemetry?
  // FIXME: probably doesn't work with aurora-data-api
  async configureTracing(): Promise<void> {
    if (process.env.USE_LOCAL_DB) return
    const AWSXRay = await import("aws-xray-sdk")
    const pg = await import("pg")
    AWSXRay.capturePostgres(pg)
  }
}
