import { Code, LayerVersion, LayerVersionProps } from "@aws-cdk/aws-lambda"
import { Construct } from "@aws-cdk/core"
import { unique } from "../../../util/list"

export interface PrismaLayerProps extends Omit<LayerVersionProps, "code"> {}

/**
 * Construct a lambda layer with Prisma libraries.
 * Be sure to omit the prisma layer modules from your function bundles with the `externalModules` option.
 * Include `environment` to point prisma at the right library location.
 *
 * @example
 * ```ts
 *   // shared lambda layer
 *   const prismaLayer = new PrismaLayer(this, "PrismaLayer", {
 *     layerVersionName: `${id}-app`,
 *     removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
 *   })
 *
 *   // default lambda function options
 *   const functionOptions: FunctionOptions = {
 *     layers: [prismaLayer],
 *     environment: { ...prismaLayer.environment, DEBUG: "*" },
 *     bundling: {
 *       externalModules: prismaLayer.externalModules,
 *     },
 *   }
 */
export class PrismaLayer extends LayerVersion {
  externalModules: string[]
  environment: Record<string, string>

  constructor(scope: Construct, id: string, { ...props }: PrismaLayerProps) {
    // modules provided by layer
    let externalModules = ["aws-sdk", "prisma", "@prisma/engines", "prisma-appsync"]

    // create asset bundle with Dockerfile
    const code = Code.fromDockerBuild(__dirname)

    super(scope, id, { ...props, code })

    // unique
    this.externalModules = unique(externalModules)
    this.environment = {
      PRISMA_QUERY_ENGINE_LIBRARY: "/opt/nodejs/node_modules/prisma/libquery_engine-rhel-openssl-1.0.x.so.node",
    }
  }
}
