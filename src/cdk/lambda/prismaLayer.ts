import { Code, LayerVersion, LayerVersionProps, Runtime } from "@aws-cdk/aws-lambda"
import { Construct } from "@aws-cdk/core"

// const PRISMA_DEPS = "prisma"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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

  constructor(scope: Construct, id: string, props?: PrismaLayerProps) {
    // create asset bundle in docker
    const layerDir = "/asset-output/nodejs"
    const code = Code.fromAsset(__dirname, {
      bundling: {
        image: Runtime.NODEJS_14_X.bundlingImage,
        command: [
          "bash",
          "-c",
          [
            `mkdir -p ${layerDir}`,
            `cd ${layerDir} && HOME=/tmp npm install prisma @prisma/client @prisma/migrate @prisma/sdk`,
          ].join(" && "),
        ],
      },
    })

    super(scope, id, { ...props, code })

    // hint for prisma to find the engine
    this.environment = {
      PRISMA_QUERY_ENGINE_LIBRARY: "/opt/nodejs/node_modules/prisma/libquery_engine-rhel-openssl-1.0.x.so.node",
    }
    // modules provided by layer
    this.externalModules = ["aws-sdk", "prisma", "@prisma/engines", "prisma-appsync"]
  }
}
