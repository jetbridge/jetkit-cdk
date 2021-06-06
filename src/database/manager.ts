import { DB_CLUSTER_ENV, DB_NAME_ENV, DB_SECRET_ENV } from "../cdk/generator"
import {
  Connection,
  ConnectionManager,
  ConnectionOptions,
  createConnection,
  EntitySchema,
  getConnectionManager,
} from "typeorm"
import { LoggerOptions } from "typeorm/logger/LoggerOptions"

// todo: maybe make connection names match DB names
// to support multiple connections to different databases
const CONNECTION_NAME = "default"

export interface ConnectionOptionsOverrides extends Omit<ConnectionOptions, "type"> {
  database?: string
}

export interface DatabaseManagerProps extends ConnectionOptionsOverrides {
  printQueries?: boolean | undefined

  // enable x-ray instrumentation
  // (may be broken)
  tracing?: boolean | undefined

  // list of all database entities
  // eslint-disable-next-line @typescript-eslint/ban-types
  entities?: (string | Function | EntitySchema<any>)[]
}

/**
 * Manager of database connections.
 * Needs some improvement. Consider it a work in progress.
 */
export class DatabaseManager {
  private _connectionManager?: ConnectionManager
  // eslint-disable-next-line @typescript-eslint/ban-types
  entities?: (string | Function | EntitySchema<any>)[]
  database?: string
  printQueries?: boolean | undefined
  tracing?: boolean | undefined
  connectionOpts: ConnectionOptionsOverrides

  /**
   * @param entities List of all database entities
   */
  constructor(props?: DatabaseManagerProps) {
    const { entities, printQueries, tracing, database, ...connectionOpts } = props || {}
    if (entities) this.entities = entities
    this.printQueries = printQueries
    this.tracing = tracing
    if (database) this.database = database as string
    this.connectionOpts = connectionOpts
  }

  get connectionManager(): ConnectionManager {
    if (this._connectionManager) return this._connectionManager
    this._connectionManager = getConnectionManager()
    return this._connectionManager
  }

  /**
   *
   * @returns Database connection
   */
  public async getConnection(opts?: ConnectionOptionsOverrides): Promise<Connection> {
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

  getConnectionOptions(_opts?: ConnectionOptionsOverrides): ConnectionOptions {
    // eslint-disable-next-line prefer-const
    let { database, ...opts } = _opts || {}

    // config
    let connectionOptions: ConnectionOptions

    // logging
    const logging: LoggerOptions = ["error"]
    if (process.env.SQL_ECHO || this.printQueries) logging.push("query") // log queries

    database ||= this.database || process.env[DB_NAME_ENV] || ""

    const baseOptions = {
      ...this.connectionOpts,
      entities: this.entities || [],
      logging: logging,
      database: database as string,
      ...opts,
    }

    if (process.env.USE_LOCAL_DB) {
      console.debug("Using local database...")
      // local DB
      connectionOptions = {
        type: "postgres",
        host: process.env.DB_HOST || "",
        ...baseOptions,
      }
    } else {
      // aurora sls
      // should have these provided automatically
      const clusterArn = process.env[DB_CLUSTER_ENV]
      const secretArn = process.env[DB_SECRET_ENV]
      const region = process.env["AWS_DEFAULT_REGION"]
      if (!clusterArn || !secretArn || !database)
        throw new Error("Aurora data API credentials missing DB_CLUSTER_ENV/DB_SECRET_ENV/DB_NAME_ENV")
      if (!region) throw new Error("AWS_DEFAULT_REGION not defined")
      connectionOptions = {
        type: "aurora-data-api-pg",
        secretArn,
        resourceArn: clusterArn,
        region,
        name: CONNECTION_NAME,
        serviceConfigOptions: { logging },
        ...baseOptions,
      }
    }

    // Don't need a pwd locally
    if (process.env.DB_PASSWORD) {
      Object.assign(connectionOptions, {
        password: process.env.DB_PASSWORD,
      })
    }

    if (this.tracing) this.configureTracing()

    return connectionOptions
  }

  // instrument queries with xray
  // TODO: change to xray/opentelemetry?
  // FIXME: probably doesn't work with aurora-data-api
  // FIXME: bundling needs to ignore pg
  async configureTracing(): Promise<void> {
    if (process.env.USE_LOCAL_DB) return
    const AWSXRay = await import("aws-xray-sdk")
    const pg = await import("pg")
    AWSXRay.capturePostgres(pg)
  }
}
