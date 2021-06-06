import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { Function as LambdaFunction, LayerVersion } from "@aws-cdk/aws-lambda"
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs"
import { CfnOutput, Construct } from "@aws-cdk/core"
import { recursive as mergeRecursive } from "merge"
import { RequestHandler } from "../api/base"
import { getApiViewMetadata, getFunctionMetadata, getSubRouteMetadata, MetadataTarget } from "../metadata"
import { ApiProps, ApiView as ApiViewConstruct } from "./api/api"
import { SubRouteApi } from "./api/subRoute"
import { SlsPgDb } from "./database/serverless-pg"

// env vars
export const DB_CLUSTER_ENV = "DB_CLUSTER_ARN"
export const DB_SECRET_ENV = "DB_SECRET_ARN"
export const DB_NAME_ENV = "DB_NAME"

/**
 * Defaults for all Lambda functions in the stack.
 */
export interface FunctionOptions extends NodejsFunctionProps {
  layerArns?: string[]

  grantDatabaseAccess?: boolean
}

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
  functionOptions?: FunctionOptions

  /**
   * Database cluster.
   * For easily granting access to functions.
   */
  databaseCluster?: SlsPgDb
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
  functionOptions?: FunctionOptions
  databaseCluster?: SlsPgDb
  layerCounter = 1

  constructor(
    scope: Construct,
    id: string,
    { httpApi, resources, databaseCluster, functionOptions }: ResourceGeneratorProps
  ) {
    super(scope, id)
    this.httpApi = httpApi

    if (functionOptions) this.functionOptions = functionOptions
    if (databaseCluster) this.databaseCluster = databaseCluster

    // emit CDK constructs for specified resources
    resources.forEach((resource) => this.generateConstructsForResource(resource))

    // it's handy to have the API base URL as a stack output
    if (this.httpApi) new CfnOutput(this, "ApiBase", { exportName: "ApiBase", value: this.httpApi.url || "Unknown" })
  }

  generateConstructsForResource(resource: MetadataTarget) {
    this.generateConstructsForClass(resource)
    this.generateConstructsForFunction(resource as RequestHandler)
  }

  private resolveLayerReferences(apiProps: ApiProps): ApiProps {
    const { layerArns, ...optsRest } = apiProps
    if (!layerArns) return apiProps

    // resolve layer ARNs
    optsRest.layers ||= []
    layerArns.forEach((arn) => {
      optsRest.layers!.push(LayerVersion.fromLayerVersionArn(this, `Layer${this.layerCounter++}`, arn))
    })

    return optsRest
  }

  private mergeFunctionDefaults(functionOptions: FunctionOptions): ApiProps {
    const mergedOptions: ApiProps = {
      ...mergeRecursive(this.functionOptions ?? {}, functionOptions),
      httpApi: this.httpApi,
    }
    return this.resolveLayerReferences(mergedOptions)
  }

  /**
   * Create function handler for a simple routed function.
   */
  generateConstructsForFunction(resource: RequestHandler) {
    const funcMeta = getFunctionMetadata(resource)
    if (!funcMeta) return

    const { requestHandlerFunc, ...funcMetaRest } = funcMeta
    const name = requestHandlerFunc.name
    const mergedOptions = this.mergeFunctionDefaults(funcMetaRest)
    const view = new ApiViewConstruct(this, `Func-${name}`, mergedOptions)
    this.grantFunctionAccess(mergedOptions, view.handlerFunction)
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
      const mergedOptions = this.mergeFunctionDefaults(apiViewMeta)
      apiViewConstruct = new ApiViewConstruct(this, `Class-${name}`, mergedOptions)
      this.grantFunctionAccess(mergedOptions, apiViewConstruct.handlerFunction)
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

  /**
   * Grant function access to what is configured.
   */
  protected grantFunctionAccess(options: FunctionOptions, func: LambdaFunction): void {
    // aurora data API access
    if (options.grantDatabaseAccess && this.databaseCluster) {
      // if (!this.databaseCluster) throw new Error("grantDatabaseAccess is true but no databaseCluster is defined")

      this.databaseCluster.grantDataApiAccess(func)

      // provide cluster/secret ARN and DB name to function
      func.addEnvironment(DB_CLUSTER_ENV, this.databaseCluster.getDataApiParams().clusterArn)
      func.addEnvironment(DB_SECRET_ENV, this.databaseCluster.getDataApiParams().secretArn)
      if (this.databaseCluster.dbName) func.addEnvironment(DB_NAME_ENV, this.databaseCluster.dbName)
      console.debug(
        `🗝 Granting ${func} database access for ${
          this.databaseCluster.dbName || "cluster " + this.databaseCluster.clusterIdentifier
        }`
      )
    }
  }
}
