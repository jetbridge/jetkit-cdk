import { Code, LayerVersion, LayerVersionProps, Runtime } from "@aws-cdk/aws-lambda"
import { Construct, IgnoreMode } from "@aws-cdk/core"

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
  bundleCommand?: string
}

/**
 * Construct a lambda layer with some base common dependencies.
 * Copies over selected node_modules.
 * Be sure to omit the layer modules from your function bundles with the `externalModules` option.
 */
export class AppLayer extends LayerVersion {
  externalModules: string[]

  constructor(
    scope: Construct,
    id: string,
    { code, bundleCommand, projectRoot, nodeModules, prismaPath, ...props }: AppLayerProps
  ) {
    let externalModules = ["aws-sdk", ...(nodeModules || [])]

    // node_modules output (in docker)
    const nm = "/asset-output/nodejs/node_modules"

    // exclude from copying to build environment to speed things up
    const exclude: string[] = ["*", "!node_modules/.prisma", "!node_modules/@prisma", "!node_modules/prisma"]
    if (prismaPath) exclude.push(`!${prismaPath}`)

    // other node_modules to move to layer
    let nodeModulesCopy: string[] = []
    if (nodeModules) {
      // what node modules to copy to layer
      const nodeModulesPaths = nodeModules.map((dir) => `node_modules/${dir}`)
      nodeModulesCopy = nodeModules.map(
        (dir) => `mkdir -p "${nm}/${dir}" && cp -rT "node_modules/${dir}" "${nm}/${dir}"`
      )
      exclude.push(...nodeModulesPaths.map((d) => `!${d}`))
    }

    const prismaCmds: string[] = []
    if (prismaPath) {
      // generate + bundle prisma client
      prismaCmds.push(
        // copy prisma config/schema/migrations
        `cp -r ${prismaPath} /asset-output/nodejs/`,
        "pushd /asset-output/nodejs",
        "HOME=/tmp npx prisma generate",
        "popd",
        // don't need two sets of engines
        `rm -f ${nm}/.prisma/client/*-engine-*`,
        `rm -f ${nm}/prisma/client/*-engine-*`,
        // remove unused engine files
        `rm -f ${nm}/@prisma/engines/prisma-fmt-*`,
        `rm -f ${nm}/@prisma/engines/introspection-engine-*`,
        `rm -f ${nm}/@prisma/engines/migration-engine-*`,
        // remove macOS clients if present
        `rm -f ${nm}/prisma/*-engine-darwin`,
        // remove docs
        `rm -rf ${nm}/prisma/build`,
        // invalid symlinks
        `rm -rf ${nm}/.bin`
      )
      externalModules = externalModules.concat([
        "prisma",
        ".prisma",
        ".prisma/client",
        "@prisma/migrate",
        "@prisma/engines",
        "@prisma/client",
      ])
    }

    // commands to create bundle
    const commands = [
      // run user-supplied command
      bundleCommand,
      // copy over node modules
      ...nodeModulesCopy,
      // prisma client
      ...prismaCmds,
    ].filter((c) => c)

    // create asset bundle
    try {
      code ||= Code.fromAsset(projectRoot, {
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

    this.externalModules = externalModules
  }
}
