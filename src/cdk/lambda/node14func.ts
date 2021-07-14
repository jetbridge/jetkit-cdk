/* eslint-disable prefer-const */
import "source-map-support/register"
import { BundlingOptions, NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { Construct } from "@aws-cdk/core"
import { Runtime } from "@aws-cdk/aws-lambda"
import { Vpc } from "@aws-cdk/aws-ec2"
import { DB_SECRET_ENV, SlsPgDb } from "../.."

export type Node14FuncProps = NodejsFunctionProps

/**
 * Lambda function with agreeable defaults.
 *
 * @category Construct
 */
export class Node14Func extends NodejsFunction {
  bundling?: BundlingOptions

  constructor(scope: Construct, id: string, props: Node14FuncProps) {
    let { environment, runtime, bundling, ...rest } = props

    // default to source map support in node enabled
    // makes your stack traces look nicer if sourceMap is turned on
    environment ||= {}
    if (!environment.NODE_OPTIONS) environment.NODE_OPTIONS = "--enable-source-maps"

    // node 14
    runtime ||= Runtime.NODEJS_14_X

    // we should preserve function names for introspection
    // https://esbuild.github.io/api/#keep-names
    bundling ||= {}
    let { keepNames, ...bundlingRest } = bundling
    if (typeof keepNames == "undefined") keepNames = true

    const newProps: NodejsFunctionProps = {
      ...rest,
      environment,
      runtime,
      bundling: {
        keepNames,
        ...bundlingRest,
      },
    }

    super(scope, id, newProps)

    this.bundling = bundling
  }
}

export interface DatabaseFuncProps extends Node14FuncProps {
  vpc: Vpc
  db: SlsPgDb
}

/**
 * Lambda function with Prisma layer and generated client.
 * Grants access to DB and secret.
 * @alpha
 */
export class PrismaNode14Func extends Node14Func {
  constructor(scope: Construct, id: string, { db, bundling, layers, ...props }: DatabaseFuncProps) {
    // add prisma layer
    layers ||= []
    bundling ||= {}
    ;(bundling as any).externalModules ||= []
    bundling.externalModules!.push(...db.getPrismaExternalModules())
    layers.push(db.getPrismaLayerVersion())

    super(scope, id, {
      ...props,
      layers,
      bundling,
    })

    // allow DB access
    db.grantDataApiAccess(this)
    db.connections.allowDefaultPortFrom(this)
    if (db.secret) {
      this.addEnvironment(DB_SECRET_ENV, db.secret.secretArn)
      db.secret.grantRead(this)
    }
  }
}
