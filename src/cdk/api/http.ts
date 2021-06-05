// Represents a JetKit HTTP API
import { HttpApi as HttpApiBase, HttpApiProps as HttpApiPropsBase } from "@aws-cdk/aws-apigatewayv2"
import { Construct } from "@aws-cdk/core"

type HttpApiProps = HttpApiPropsBase

export class HttpApi extends HttpApiBase {
  constructor(scope: Construct, id: string, props: HttpApiProps) {
    super(scope, id, props)
  }
}
