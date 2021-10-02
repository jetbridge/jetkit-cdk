import { Code, LayerVersion, LayerVersionProps } from "@aws-cdk/aws-lambda"
import { Construct } from "@aws-cdk/core"
import { unique } from "../../../util/list"

export interface PrismaLayerProps extends Partial<LayerVersionProps> {
  // Path to prisma directory
  // Will be copied to layer
  prismaPath: string
}

/**
 * Construct a lambda layer with Prisma libraries.
 * Be sure to omit the prisma layer modules from your function bundles with the `externalModules` option.
 *
 * @example With Generator
 * ```ts
 *   // shared lambda layer
 *   const prismaLayer = new PrismaLayer(this, "PrismaLayer", {
 *     layerVersionName: `${id}-app`,
 *     removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
 *     prismaPath: path.join("packages", "repo", "prisma"),
 *   })
 *
 *   // default lambda function options
 *   const functionOptions: FunctionOptions = {
 *     layers: [prismaLayer],
 *     bundling: {
 *       externalModules: prismaLayer.externalModules,
 *     },
 *   }
 */
export class PrismaLayer extends LayerVersion {
  externalModules: string[]

  constructor(scope: Construct, id: string, { code, prismaPath, ...props }: PrismaLayerProps) {
    let externalModules = ["aws-sdk"]

    // // node_modules output (in docker)
    // const nm = "/asset-output/nodejs/node_modules"

    // // exclude from copying to build environment to speed things up
    // const exclude: string[] = ["*", "!node_modules/.bin", ...prismaDirs.map((d) => `!node_modules/${d}`)]

    // const prismaCmds: string[] = ["npm install", `HOME=/tmp PATH=$PATH:node_modules/.bin npx prisma generate"`]
    // exclude.push(`!${prismaPath}`)
    // // bundle prisma libraries
    // prismaCmds.push(
    //   // create node_modules
    //   `mkdir -p ${nm}`,

    //   // copy prisma config/schema/migrations/generated clients
    //   // `cp -r "${prismaPath}" /asset-output/nodejs/`,

    //   // copy prisma libraries
    //   // ...prismaDirs.map((d) => `cp -rp node_modules/${d} ${nm}/`),

    //   // CLEANUP + SHRINK
    //   // remove generated client
    //   `rm -rf ${nm}/.prisma`,
    //   `rm -rf ${nm}/@prisma/client`, // can't find .prisma/client from layer
    //   `ls ${nm}/prisma`,
    //   // don't need extra sets of engines
    //   `rm -f ${nm}/prisma/client/*{-,_}engine-*`,
    //   `rm -f ${nm}/prisma/engines/*engine-*`,
    //   // remove unused engine files
    //   `rm -f ${nm}/@prisma/engines/prisma-fmt-*`,
    //   `rm -f ${nm}/@prisma/engines/introspection-engine-*`,
    //   `rm -f ${nm}/prisma/query-engine-*`,
    //   // `rm -f ${nm}/@prisma/engines/migration-engine-*`,
    //   // remove macOS clients if present
    //   `rm -f ${nm}/prisma/*-darwin*`,
    //   `rm -f ${nm}/@prisma/engines/*-darwin*`,
    //   // remove docs
    //   `rm -rf ${nm}/prisma/build`,
    //   // remove appsync generator
    //   `rm -rf ${nm}/prisma-appsync/dist/generator.js`,
    //   // invalid symlinks
    //   `rm -rf ${nm}/.bin`,
    //   // extraneous scripts
    //   `rm -rf ${nm}/prisma-appsync/dist/generator.js`,
    //   `rm -rf ${nm}/prisma-appsync/pnpm-lock.yaml`,
    //   `rm -rf ${nm}/prisma/prisma-client/src/__tests__`
    // )

    // modules provided by layer
    externalModules = externalModules.concat("prisma", "@prisma/engines", "prisma-appsync")

    // create asset bundle
    code ||= Code.fromDockerBuild(__dirname, {})

    super(scope, id, { ...props, code })

    // unique
    this.externalModules = unique(externalModules)
  }
}
