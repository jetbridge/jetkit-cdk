import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { Construct } from "@aws-cdk/core"
import deepmerge from "deepmerge"
import { RequestHandler } from "../api/base"
import { getApiViewMetadata, getFunctionMetadata, getSubRouteMetadata, MetadataTarget } from "../metadata"
import { ApiProps, ApiView as ApiViewConstruct } from "./api/api"
import { SubRouteApi } from "./api/subRoute"

/**
 * CDK {@link Construct} that automatically generates cloud resources
 * based on metadata defined on your application code using
 * {@link Lambda}, {@link ApiView}, {@link SubRoute}.
 *
 * @module
 */

export interface ResourceGeneratorProps {
  /**
   * A list of resources to generate cloud resources for.
   *
   * Generates API Gateway routes and Lambda functions.
   */
  resources: MetadataTarget[]

  /**
   * The {@link HttpApi} to attach routes to.
   */
  httpApi: HttpApi

  /**
   * Default Lambda function options.
   */
  functionOptions?: NodejsFunctionProps
}

/**
 * Given a list of application resources with metadata attached,
 * generate appropriate CDK resources.
 *
 * This construct ingests a list of API classes and their methods and generates
 * API routes and lambda function handlers.
 *
 * @category Construct
 */
export class ResourceGenerator extends Construct {
  httpApi: HttpApi
  functionOptions?: NodejsFunctionProps

  constructor(scope: Construct, id: string, { httpApi, resources, functionOptions }: ResourceGeneratorProps) {
    super(scope, id)
    this.httpApi = httpApi
    this.functionOptions = functionOptions

    // emit CDK constructs for specified resources
    resources.forEach((resource) => this.generateConstructsForResource(resource))
  }

  generateConstructsForResource(resource: MetadataTarget) {
    this.generateConstructsForClass(resource)
    this.generateConstructsForFunction(resource as RequestHandler)
  }

  /**
   * Create function handler for a simple routed function.
   */
  generateConstructsForFunction(resource: RequestHandler) {
    const funcMeta = getFunctionMetadata(resource)
    if (!funcMeta) return

    const { requestHandlerFunc, ...rest } = funcMeta
    const name = requestHandlerFunc.name
    new ApiViewConstruct(this, `Func-${name}`, {
      httpApi: this.httpApi,
      entry: funcMeta.entry,
      ...rest,
    })
  }

  /**
   * Create a handler function for the class and any additional
   * routed methods inside it.
   */
  generateConstructsForClass(resource: MetadataTarget) {
    // API view
    const apiViewMeta = getApiViewMetadata(resource)
    let apiViewConstruct: undefined | ApiViewConstruct
    if (apiViewMeta) {
      const name = apiViewMeta.apiClass.name

      // merge function option defaults with options from attached metadata (from decorator)
      const mergedOptions: Omit<ApiProps, "httpApi"> = deepmerge(this.functionOptions || {}, apiViewMeta)

      apiViewConstruct = new ApiViewConstruct(this, `Class-${name}`, {
        httpApi: this.httpApi,
        ...mergedOptions,
      })
    }

    // SubRoutes - methods with their own routes
    // handled by the classes's handler
    const subRoutes = getSubRouteMetadata(resource)
    if (subRoutes) {
      subRoutes.forEach((meta, subroutePath) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { path: metaPath, propertyKey, ...metaRest } = meta

        if (!apiViewConstruct) throw new Error(`${resource} defines SubRoute but no enclosing @ApiView class found`)

        // TODO: include parent api class name in id
        // TODO: do something with propertyKey and requestHandlerFunc
        const path = metaPath || subroutePath
        new SubRouteApi(this, `SubRoute-${meta.propertyKey}`, {
          path,
          ...metaRest,
          parentApi: apiViewConstruct,
        })
      })
    }
  }
}
