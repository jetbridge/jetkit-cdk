import { Vpc } from "@aws-cdk/aws-ec2"
import { Construct } from "@aws-cdk/core"
import { DB_SECRET_ENV, Node14Func, Node14FuncProps, SlsPgDb } from "../.."
import { DB_URL_ENV } from "../generator"

export interface DatabaseFuncProps extends Node14FuncProps {
  vpc: Vpc
  db: SlsPgDb
}

/**
 * Lambda function with database access.
 * Grants access to DB and secret.
 * To use be sure to provide bundling.layer = [appLayer] and externalModules = appLayer.externalModules.
 * @alpha
 */
export class PrismaNode14Func extends Node14Func {
  constructor(scope: Construct, id: string, { db, vpc, ...props }: DatabaseFuncProps) {
    super(scope, id, {
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
