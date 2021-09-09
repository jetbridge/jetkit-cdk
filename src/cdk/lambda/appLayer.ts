import { Code, LayerVersion, LayerVersionProps, Runtime } from "@aws-cdk/aws-lambda"
import { AssetHashType, Construct, IgnoreMode } from "@aws-cdk/core"
import { unique } from "../../util/list"

export interface AppLayerProps extends Partial<LayerVersionProps> {
  // Path to directory containing node_modules to bundle
  projectRoot: string

  // Path to prisma directory
  // If specified, prisma client will be generated from here and
  // prisma clients will be provided by layer automatically.
  prismaPath?: string

  // Directories to copy from node_modules to layer
  nodeModules?: string[]

  // Bash script to run in projectPath for bundle
  // Layer contents are in /asset-output
  bundlePreCommand?: string
  bundlePostCommand?: string
}

/**
 * Construct a lambda layer with some base common dependencies.
 * Copies over selected node_modules.
 * Be sure to omit the layer modules from your function bundles with the `externalModules` option.
 *
 * @example With Generator
 * ```ts
 *   // shared lambda layer
 *   const appLayer = new AppLayer(this, "AppLayer", {
 *     layerVersionName: `${id}-app`,
 *     removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
 *     projectRoot: path.join(__dirname, "..", "..", ".."),
 *     prismaPath: path.join("packages", "repo", "prisma"),
 *   })
 *
 *   // default lambda function options
 *   const functionOptions: FunctionOptions = {
 *     layers: [appLayer],
 *     bundling: {
 *       externalModules: appLayer.externalModules,
 *     },
 *   }
 */
export class AppLayer extends LayerVersion {
  externalModules: string[]

  constructor(
    scope: Construct,
    id: string,
    { code, bundlePreCommand, bundlePostCommand, projectRoot, nodeModules, prismaPath, ...props }: AppLayerProps
  ) {
    nodeModules ||= []
    let externalModules = ["aws-sdk", ...(nodeModules || [])]

    // node_modules output (in docker)
    const nm = "/asset-output/nodejs/node_modules"

    const prismaDirs = ["prisma", ".prisma", "@prisma", "prisma-appsync"]

    // exclude from copying to build environment to speed things up
    const exclude: string[] = ["*", "!node_modules/.bin", ...prismaDirs.map((d) => `!node_modules/${d}`)]

    const prismaCmds: string[] = []
    if (prismaPath) {
      exclude.push(`!${prismaPath}`)
      // generate + bundle prisma client and libraries
      prismaCmds.push(
        // create node_modules
        `mkdir -p ${nm}`,

        // generate prisma clients in root project
        `HOME=/tmp PATH=$PATH:node_modules/.bin npx prisma generate --schema "${prismaPath}/schema.prisma"`,
        // copy prisma config/schema/migrations/generated clients
        `cp -r "${prismaPath}" /asset-output/nodejs/`,

        // copy prisma libraries
        ...prismaDirs.map((d) => `cp -rp node_modules/${d} ${nm}/`),

        // SKIP FOR NOW
        // will be regenerated
        // `rm -rf /asset-output/nodejs/prisma/generated`,
        // `mkdir -p /asset-output/nodejs/prisma/generated/prisma-appsync/client`,
        // generate
        // "pushd /asset-output/nodejs",
        // `HOME=/tmp PATH=$PATH:${nm}/.bin npx prisma generate`,
        // "popd",

        // CLEANUP + SHRINK
        // don't need two sets of engines
        `rm -f ${nm}/.prisma/client/*-engine-*`,
        `rm -f ${nm}/prisma/client/*-engine-*`,
        // remove unused engine files
        `rm -f ${nm}/@prisma/engines/prisma-fmt-*`,
        `rm -f ${nm}/@prisma/engines/introspection-engine-*`,
        // `rm -f ${nm}/@prisma/engines/migration-engine-*`,
        // remove macOS clients if present
        `rm -f ${nm}/prisma/*-engine-darwin`,
        // remove docs
        `rm -rf ${nm}/prisma/build`,
        // invalid symlinks
        `rm -rf ${nm}/.bin`
      )

      // modules provided by layer
      externalModules = externalModules.concat(
        "prisma",
        ".prisma",
        ".prisma/client",
        "@prisma/engines",
        "@prisma/client",
        "prisma-appsync"
      )
    }

    // other node_modules to move to layer
    let nodeModulesCopy: string[] = []
    if (nodeModules) {
      nodeModules = unique(nodeModules)
      // what node modules to copy to layer
      const nodeModulesPaths = nodeModules.map((dir) => `node_modules/${dir}`)
      nodeModulesCopy = nodeModules.map(
        (dir) => `mkdir -p "${nm}/${dir}" && cp -rT "node_modules/${dir}" "${nm}/${dir}"`
      )
      exclude.push(...nodeModulesPaths.map((d) => `!${d}`))
    }

    // commands to create bundle
    const commands = [
      // run user-supplied command
      bundlePreCommand,
      // prisma client
      ...prismaCmds,
      // copy over node modules
      ...nodeModulesCopy,
      // run user-supplied command
      bundlePostCommand,
    ].filter((c) => c)

    // create asset bundle
    try {
      code ||= Code.fromAsset(projectRoot, {
        assetHashType: AssetHashType.OUTPUT,
        ignoreMode: IgnoreMode.DOCKER,
        exclude,
        bundling: {
          image: Runtime.NODEJS_14_X.bundlingImage,

          // build layer image in /asset-output
          command: ["bash", "-c", commands.join(" && ")],
        },
      })
    } catch (ex) {
      throw new Error(`Creating AppLayer failed: ${ex}\n\nBundling commands run: ${commands}`)
    }

    super(scope, id, { ...props, code })

    // unique
    this.externalModules = unique(externalModules)
  }
}
