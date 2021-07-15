import { ILayerVersion, LayerVersion } from "@aws-cdk/aws-lambda"
import { DatabaseClusterEngine, IClusterEngine, ServerlessCluster, ServerlessClusterProps } from "@aws-cdk/aws-rds"
import * as core from "@aws-cdk/core"
import { Fn, Token } from "@aws-cdk/core"
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { IVpc } from "@aws-cdk/aws-ec2"

// default version of https://github.com/jetbridge/lambda-layer-prisma-pg
export const PRISMA_PG_LAYER_VERSION = 10

let layerVersionCount = 1

export interface SlsPgDbProps extends Omit<ServerlessClusterProps, "engine"> {
  engine?: IClusterEngine
}

/**
 * Quickest and easiest way to get a Postgres database.
 * Uses Aurora Serverless.
 * Generates secret.
 * and https://docs.aws.amazon.com/cdk/api/latest/docs/aws-rds-readme.html#data-api
 */
export class SlsPgDb extends ServerlessCluster {
  defaultDatabaseName?: string

  // it's private in ServerlessCluster for some reason?
  vpc_: IVpc

  constructor(
    scope: core.Construct,
    id: string,
    { defaultDatabaseName, engine = DatabaseClusterEngine.AURORA_POSTGRESQL, ...props }: SlsPgDbProps
  ) {
    const superProps: ServerlessClusterProps = {
      engine,
      defaultDatabaseName,
      ...props,
    }
    super(scope, id, superProps)

    // save
    this.defaultDatabaseName = defaultDatabaseName
    this.vpc_ = props.vpc
  }

  /**
   * Generate a database connection string (DSN).
   */
  makeDatabaseUrl() {
    const dbUsername = this.secret?.secretValueFromJson("username")
    const dbPassword = this.secret?.secretValueFromJson("password")

    return (
      "postgresql://" +
      `${dbUsername}:${dbPassword}@${this.clusterEndpoint.hostname}/` +
      // TODO: how to get db name if not explicitly provided?
      (this.defaultDatabaseName || "")
    )
  }

  /**
   * Get params for connecting via data API.
   * Make sure you set enableDataApi: true
   * or call grantDataApiAccess()
   */
  getDataApiParams() {
    if (!this.secret) throw new Error("cluster missing secret")
    return {
      clusterArn: this.clusterArn,
      secretArn: this.secret.secretArn,
    }
  }

  /**
   * Adds a layer containing prisma, pg
   */
  addPrismaLayer(functionOptions: Partial<NodejsFunctionProps>, layerVersion?: number) {
    // amend func bundling options
    functionOptions ||= {}
    ;(functionOptions.layers as any) ||= []
    ;(functionOptions as any).bundling ||= {}
    ;(functionOptions.bundling as any).externalModules ||= []

    // add prisma layer
    functionOptions!.layers!.push(this.getPrismaLayerVersion(layerVersion))

    // add external modules (skip from bundle because they're in the layer)
    functionOptions!.bundling!.externalModules!.push(...this.getPrismaExternalModules())
  }

  /**
   * Modules provided by Prisma layer.
   * Can be specified as bundling.externalModules to lambda functions to reduce bundle size.
   */
  getPrismaExternalModules(): string[] {
    return [
      // from layer
      "prisma",
      "@prisma/migrate",
      "@prisma/engines",
      "pg",
      "pg-native",

      // from lambda env
      "aws-sdk",
    ]
  }

  /**
   * Get prisma lambda layer.
   * See: https://github.com/jetbridge/lambda-layer-prisma-pg for details.
   */
  getPrismaLayerVersion(defaultLayerVersion?: number): ILayerVersion {
    // version of this layer
    defaultLayerVersion ||= PRISMA_PG_LAYER_VERSION
    const layerRegionVersionMap: { [index: string]: number } = {
      "us-east-1": defaultLayerVersion,
      "us-west-2": defaultLayerVersion,
      "eu-west-1": defaultLayerVersion,
      "eu-central-1": defaultLayerVersion,
    }
    const region = this.stack.region

    const version = Token.isUnresolved(region) ? defaultLayerVersion : layerRegionVersionMap[region]
    if (!version) throw new Error(`No PrismaPg layer defined for region ${region}`)

    return LayerVersion.fromLayerVersionArn(
      this,
      `PrismaPgLayer${layerVersionCount++}`,
      Fn.join(":", ["arn:aws:lambda", region, "898466741470:layer:PrismaPg", version.toString()])
    )
  }
}
