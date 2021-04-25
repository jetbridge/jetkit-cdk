/* eslint-disable prefer-const */
import "source-map-support/register"
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { Construct } from "@aws-cdk/core"
import { Runtime } from "@aws-cdk/aws-lambda"

export type Node14FuncProps = NodejsFunctionProps

/**
 * @category Construct
 */
export class Node14Func extends NodejsFunction {
  constructor(scope: Construct, id: string, props: Node14FuncProps) {
    let { environment, runtime, awsSdkConnectionReuse, ...rest } = props

    // default to source maps enabled
    environment ||= {}
    if (!environment.NODE_OPTIONS) environment.NODE_OPTIONS = "--enable-source-maps"

    // node 14
    runtime ||= Runtime.NODEJS_14_X

    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
    if (typeof awsSdkConnectionReuse === "undefined") awsSdkConnectionReuse = true

    const newProps = {
      ...rest,
      awsSdkConnectionReuse,
      environment,
      runtime,
    }

    super(scope, id, newProps)
  }
}
