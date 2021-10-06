/* eslint-disable prefer-const */
import { BundlingOptions, NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { Construct } from "@aws-cdk/core"
import { Runtime } from "@aws-cdk/aws-lambda"
import { MetadataTarget } from "@jetkit/cdk-runtime"

export interface Node14FuncProps extends NodejsFunctionProps {
  // reference to metadata used to generate this function
  metadataTarget?: MetadataTarget

  // function or class name this was generated from
  name?: string
}

function addPropDefaults({ environment, runtime, metadataTarget, name, ...rest }: Node14FuncProps): Node14FuncProps {
  // default to source map support in node enabled
  // makes your stack traces look nicer if sourceMap is turned on
  environment ||= {}
  if (!environment.NODE_OPTIONS) environment.NODE_OPTIONS = "--enable-source-maps"

  // node 14
  runtime ||= Runtime.NODEJS_14_X

  const newProps: NodejsFunctionProps = {
    ...rest,
    environment,
    runtime,
  }

  return newProps
}

/**
 * Lambda function with agreeable defaults.
 *
 * @category Construct
 */
export class Node14Func extends NodejsFunction {
  bundling?: BundlingOptions
  protected metadataTarget?: WeakRef<MetadataTarget>
  name?: string

  constructor(scope: Construct, id: string, props: Node14FuncProps) {
    super(scope, id, addPropDefaults(props))

    let { metadataTarget, name, ...rest } = props
    this.bundling = rest.bundling
    this.name = name

    // save a weak reference to the function or class's metadata we were generated for
    // it's a circular reference so we keep a weak ref
    if (metadataTarget) this.metadataTarget = new WeakRef(metadataTarget)
  }

  getMetadataTarget(): MetadataTarget | undefined {
    return this.metadataTarget?.deref()
  }
}
