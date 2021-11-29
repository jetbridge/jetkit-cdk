/* eslint-disable prefer-const */
import { HttpApi, PayloadFormatVersion } from "@aws-cdk/aws-apigatewayv2"
import { Rule } from "@aws-cdk/aws-events"
import { Alias, Function, LayerVersion, AutoScalingOptions } from "@aws-cdk/aws-lambda"
import { Aws, CfnOutput, Construct, Fn } from "@aws-cdk/core"
import deepmerge from "deepmerge"
import isPlainObject from "is-plain-object"
import { ApiViewClassMetadata, FunctionMetadata, SubRouteApiMetadata } from "../metadata"
import { ApiFunction, JetKitLambdaFunction } from "./api/api"
import { SubRouteApi } from "./api/subRoute"
import * as targets from "@aws-cdk/aws-events-targets"
import { SlsPgDb } from "./database/serverless-pg"
import { IVpc } from "@aws-cdk/aws-ec2"
import { debug } from "../util/log"
import { Node14Func, Node14FuncProps } from "./lambda/node14func"
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations"
import slugify from "slugify"
import {
  ApiHandler,
  getApiViewMetadata,
  getFunctionMetadata,
  getSubRouteMetadata,
  MetadataTarget,
  PossibleLambdaHandlers,
} from "@jetkit/cdk-runtime"

// env vars
export const DB_CLUSTER_ENV = "DB_CLUSTER_ARN"
export const DB_SECRET_ENV = "DB_SECRET_ARN"
export const DB_NAME_ENV = "DB_NAME"
export const DB_URL_ENV = "DATABASE_URL"

export type GeneratedFunction = Node14Func

/**
 * Defaults for all Lambda functions in the stack.
 */
export interface FunctionOptions extends Node14FuncProps {
  layerArns?: string[]

  grantDatabaseAccess?: boolean

  /**
   * VPC for functions.
   * Defaults to database VPC if grantDatabaseAccess is true.
   */
  vpc?: IVpc

  /**
   * Autoscaling and provisioned concurrency settings.
   */
  autoScalingOptions?: AutoScalingOptions
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
  resources?: MetadataTarget[]

  /**
   * The {@link HttpApi} to attach routes to.
   * Required for generating API endpoints.
   */
  httpApi?: HttpApi

  /**
   * Default Lambda function options.
   */
  functionOptions?: FunctionOptions

  /**
   * Database cluster.
   * For easily granting access to functions.
   */
  databaseCluster?: SlsPgDb

  /**
   * Prefix for function names.
   * If set, your functions will have clean names without a random suffix.
   */
  functionPrefix?: string
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
  /**
   * Default options for Lambda functions.
   * Can be overridden.
   */
  functionOptions?: FunctionOptions

  /**
   * Lambda functions that were generated.
   */
  generatedLambdas: GeneratedFunction[]

  functionPrefix?: string

  private layerCounter = 1
  private ruleCounter = 1
  private seenFunctionNames: Record<string, number>
  httpApi?: HttpApi
  databaseCluster?: SlsPgDb

  constructor(
    scope: Construct,
    id: string,
    { httpApi, resources, databaseCluster, functionOptions, functionPrefix }: ResourceGeneratorProps
  ) {
    super(scope, id)

    this.httpApi = httpApi
    this.functionPrefix = functionPrefix

    this.generatedLambdas = []
    this.seenFunctionNames = {}

    if (functionOptions) this.functionOptions = functionOptions
    if (databaseCluster) this.databaseCluster = databaseCluster

    // emit CDK constructs for specified resources
    resources?.forEach((resource) => this.generateConstructsForResource(resource))

    // it's handy to have the API base URL as a stack output
    if (this.httpApi?.url) {
      const apiName = this.httpApi.httpApiName || "ApiBase"
      new CfnOutput(this, apiName, {
        value: this.httpApi.url,
        ...(apiName ? { exportName: Fn.join("-", [Aws.STACK_NAME, apiName]) } : {}),
      })
    }
  }

  generateConstructsForResource(resource: MetadataTarget | PossibleLambdaHandlers) {
    // class?
    if (getApiViewMetadata(resource)) this.generateConstructsForClass(resource)

    // function?
    if (getFunctionMetadata(resource as PossibleLambdaHandlers))
      this.generateConstructsForFunction(resource as ApiHandler)
  }

  /**
   * Converts Layer ARNs to LayerVersions
   * Just for convenience
   */
  protected resolveLayerReferences(funcOpts: FunctionOptions): FunctionOptions {
    const { layerArns, ...optsRest } = funcOpts
    if (!layerArns) return funcOpts

    // resolve layer ARNs
    optsRest.layers ||= []
    layerArns.forEach((arn) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      optsRest.layers!.push(LayerVersion.fromLayerVersionArn(this, `Layer${this.layerCounter++}`, arn))
    })

    return optsRest
  }

  mergeFunctionDefaults(functionOptions: FunctionOptions): FunctionOptions {
    let mergedOptions: FunctionOptions = {
      ...deepmerge(
        // defaults
        this.functionOptions ?? {},
        // function overrides
        functionOptions,
        {
          // preserve instances like Duration
          // https://github.com/TehShrike/deepmerge#ismergeableobject
          isMergeableObject: isPlainObject,
        }
      ),
    }

    mergedOptions = this.configureVpc(mergedOptions)

    return this.resolveLayerReferences(mergedOptions)
  }

  protected createLambdaFunction(
    name: string,
    metadataTarget: MetadataTarget,
    functionOptions: FunctionOptions
  ): JetKitLambdaFunction {
    let { functionName, ...rest } = functionOptions
    functionName ||= this.generateFunctionName(name, functionOptions)

    // build Node Lambda function
    // const funcHash = hashik(name, path.basename(functionOptions.entry || ""), functionOptions.handler)
    const funcId = `Func-${name}` // must be unique
    const handlerFunction = new JetKitLambdaFunction(this, funcId, {
      ...rest,
      functionName,
      name,
      metadataTarget,
    })

    // grant access
    this.grantFunctionAccess(functionOptions, handlerFunction)

    // configure autoscaling
    this.configureAutoScaling(funcId, functionOptions, handlerFunction)

    // track
    this.generatedLambdas.push(handlerFunction)

    return handlerFunction
  }

  protected configureAutoScaling(id: string, functionOptions: FunctionOptions, lambdaFunction: JetKitLambdaFunction) {
    if (!functionOptions.autoScalingOptions) return

    // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-readme.html#autoscaling
    const currentAlias = new Alias(this, `${id}Alias`, {
      aliasName: "current",
      version: lambdaFunction.currentVersion,
    })
    currentAlias.addAutoScaling(functionOptions.autoScalingOptions)
  }

  protected generateFunctionName(name: string, functionOptions: FunctionOptions): string | undefined {
    let { functionName } = functionOptions

    // disable CDK name mangling for the function name
    if (this.functionPrefix) functionName ||= `${this.functionPrefix}-${name}`
    if (!functionName) return undefined

    // have we used this name before?
    if (this.seenFunctionNames[functionName]) {
      // increment suffix
      return `${functionName}-${++this.seenFunctionNames[functionName]}`
    }

    // mark as seen
    this.seenFunctionNames[functionName] ||= 1
    this.seenFunctionNames[functionName]++ // start at 2

    return functionName
  }

  /**
   * Put function in VPC.
   * Defaults to database VPC if database access is specified.
   *
   * N.B. NAT Gateways must exist in the VPC if a function needs internet access.
   */
  protected configureVpc(funcOptions: FunctionOptions): FunctionOptions {
    // already specified?
    const vpc = funcOptions.vpc
    if (vpc) return funcOptions

    // default to database VPC if function has DB access
    const database = this.databaseCluster
    if (database && funcOptions.grantDatabaseAccess) return { ...funcOptions, vpc: database.vpc_ }

    return funcOptions
  }

  /**
   * Create function handler for a simple routed function.
   */
  generateConstructsForFunction(resource: PossibleLambdaHandlers): JetKitLambdaFunction {
    const funcMeta = getFunctionMetadata<FunctionMetadata>(resource)
    if (!funcMeta)
      throw new Error(
        `No function metadata found on "${resource}" - did you forget to wrap it in Lambda() or LambdaCdk()?`
      )

    // get function config
    const { HandlerFunc, schedule, ...funcMetaRest } = funcMeta
    const name = HandlerFunc.name
    const mergedOptions = this.mergeFunctionDefaults(funcMetaRest)

    const handlerFunction = this.createLambdaFunction(name, resource, mergedOptions)

    // enable lambda integrations
    if (funcMeta.path) {
      if (!this.httpApi) throw new Error(`API paths defined but httpApi was not provided to ${this}`)

      // generate APIGW integration
      // hash name + entry + handler and use as suffix
      // const funcHash = hashik(name, path.basename(mergedOptions.entry || ""), mergedOptions.handler)
      new ApiFunction(this, `View-${name}`, {
        ...mergedOptions,
        path: funcMeta.path,
        handlerFunction,
        httpApi: this.httpApi,
      })
    }

    if (funcMeta.schedule) {
      // generate CloudWatch schedule
      new Rule(this, `Rule-${name}-${this.ruleCounter++}`, {
        schedule,
        description: `Lambda for ${name}`,
        targets: [new targets.LambdaFunction(handlerFunction)],
      })
    }

    return handlerFunction
  }

  /**
   * Create a single handler function for the class and any additional
   * routed methods inside it.
   */
  generateConstructsForClass(resource: MetadataTarget): JetKitLambdaFunction {
    // API view
    const apiViewMeta = getApiViewMetadata<ApiViewClassMetadata>(resource)
    let className: string
    let handlerFunction: undefined | JetKitLambdaFunction
    let lambdaApiIntegration: undefined | LambdaProxyIntegration

    // parse @ApiView meta and create lambda
    if (apiViewMeta) {
      className = apiViewMeta.apiClass.name
      // merge function option defaults with options from attached metadata (from decorator)
      const mergedOptions = this.mergeFunctionDefaults(apiViewMeta)

      if (apiViewMeta.schedule)
        throw new Error("schedule is not supported on ApiView for now (it could be easily added if desired)")

      // create lambda function
      handlerFunction = this.createLambdaFunction(className, resource, mergedOptions)
      // create lambda proxy integration for APIGW
      lambdaApiIntegration = new LambdaProxyIntegration({
        handler: handlerFunction,
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
      })
    }

    // SubRoutes - methods with their own routes
    // handled by the class's handler
    const subRoutes = getSubRouteMetadata<SubRouteApiMetadata>(resource)
    if (subRoutes) {
      subRoutes.forEach((meta) => {
        const { path: metaPath, propertyKey, ...metaRest } = meta

        if (!lambdaApiIntegration || !apiViewMeta)
          throw new Error(`${resource} defines SubRoute but no enclosing @ApiView class found`)

        const httpApi = this.httpApi
        if (!httpApi) throw new Error(`API paths defined but httpApi was not provided to ${meta}`)

        const path = metaPath
        const parentPath = apiViewMeta.path || "/"
        const subRouteApiId = slugify(`SR-${className || parentPath}-${propertyKey}`)
        new SubRouteApi(this, subRouteApiId, {
          path,
          httpApi,
          parentPath,
          ...metaRest,
          lambdaApiIntegration,
          parentApiMeta: apiViewMeta,
        })
      })
    }

    if (!apiViewMeta || !handlerFunction) throw new Error(`Class ${resource} is missing an @ApiView decorator`)

    return handlerFunction
  }

  /**
   * Grant function access to what is configured.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  protected grantFunctionAccess(options: FunctionOptions, func: Function): void {
    // check options
    if (!options.grantDatabaseAccess || !this.databaseCluster) return

    const db = this.databaseCluster

    // if (!this.databaseCluster) throw new Error("grantDatabaseAccess is true but no databaseCluster is defined")

    // data API
    db.grantDataApiAccess(func)

    // network access
    func.connections.allowToDefaultPort(db)

    // secret access
    if (db.secret) {
      func.addEnvironment(DB_SECRET_ENV, db.secret.secretArn)
      db.secret.grantRead(func)
    }

    // provide cluster/secret ARN and DB name to function
    func.addEnvironment(DB_URL_ENV, db.makeDatabaseUrl())
    func.addEnvironment(DB_CLUSTER_ENV, db.getDataApiParams().clusterArn)
    func.addEnvironment(DB_SECRET_ENV, db.getDataApiParams().secretArn)
    if (db.defaultDatabaseName) func.addEnvironment(DB_NAME_ENV, db.defaultDatabaseName)
    debug(
      `🗝  Granting ${func} database access for ${
        this.databaseCluster.defaultDatabaseName || "cluster " + this.databaseCluster.clusterIdentifier
      }`
    )
  }

  /**
   * Look up a generated function.
   */
  getFunction(filter: { ctor?: MetadataTarget; name?: string }): Node14Func | undefined {
    let fns = this.generatedLambdas
    if (!fns) return undefined

    // filter
    if (filter.ctor) fns = fns.filter((fn) => fn.getMetadataTarget() === filter.ctor)
    if (filter.name) fns = fns.filter((fn) => fn.name === filter.name)

    if (!fns.length) return undefined

    // assume we should only find one match
    if (fns.length > 1) console.warn(`Warning: getFunction(${filter}) found multiple matching functions`)

    return fns[0]
  }
}

// function hashik(...inputs: Array<string | undefined>): string {
//   console.log({ inputs })
//   let hasher = crypto.createHash("sha1")
//   inputs.forEach((inp) => hasher.update(inp || ""))
//   return hasher.digest("hex").substr(0, 3)
// }
