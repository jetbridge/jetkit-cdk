/* eslint-disable prefer-const */
import { HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { Rule } from "@aws-cdk/aws-events"
import { Function, LayerVersion } from "@aws-cdk/aws-lambda"
import { Aws, CfnOutput, Construct, Fn, Stack } from "@aws-cdk/core"
import deepmerge from "deepmerge"
import isPlainObject from "is-plain-object"
import { ApiHandler } from "../api/base"
import { getApiViewMetadata, getFunctionMetadata, getSubRouteMetadata, MetadataTarget } from "../metadata"
import { PossibleLambdaHandlers } from "../registry"
import { ApiView as ApiViewConstruct, JetKitLambdaFunction } from "./api/api"
import { SubRouteApi } from "./api/subRoute"
import * as targets from "@aws-cdk/aws-events-targets"

import { SlsPgDb } from "./database/serverless-pg"
import { IVpc } from "@aws-cdk/aws-ec2"
import { debug } from "../util/log"
import { Node14Func, Node14FuncProps } from "./lambda/node14func"

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
   * Typically will be your stack name.
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
  generatedFunctions: GeneratedFunction[]

  functionPrefix?: string

  private layerCounter = 1
  private funcCounter = 1
  private viewCounter = 1
  private ruleCounter = 1
  httpApi?: HttpApi
  databaseCluster?: SlsPgDb

  constructor(
    scope: Construct,
    id: string,
    { httpApi, resources, databaseCluster, functionOptions, functionPrefix }: ResourceGeneratorProps
  ) {
    super(scope, id)

    this.httpApi = httpApi
    this.functionPrefix = functionPrefix || Stack.of(this).stackName

    this.generatedFunctions = []

    if (functionOptions) this.functionOptions = functionOptions
    if (databaseCluster) this.databaseCluster = databaseCluster

    // emit CDK constructs for specified resources
    resources.forEach((resource) => this.generateConstructsForResource(resource))

    // it's handy to have the API base URL as a stack output
    if (this.httpApi?.url)
      new CfnOutput(this, "ApiBase", { value: this.httpApi.url, exportName: Fn.join("-", [Aws.STACK_NAME, "ApiBase"]) })
  }

  generateConstructsForResource(resource: MetadataTarget) {
    this.generateConstructsForClass(resource)
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

    // disable CDK name mangling for the function name
    if (this.functionPrefix) functionName ||= `${this.functionPrefix}-${name}`

    // build Node Lambda function
    const handlerFunction = new JetKitLambdaFunction(this, `F${this.funcCounter++}-${name}`, {
      ...rest,
      functionName,

      name,
      metadataTarget,
    })

    // grant access
    this.grantFunctionAccess(functionOptions, handlerFunction)

    // track
    this.generatedFunctions.push(handlerFunction)

    return handlerFunction
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
  generateConstructsForFunction(resource: PossibleLambdaHandlers) {
    const funcMeta = getFunctionMetadata(resource)
    if (!funcMeta) return

    // get function config
    const { HandlerFunc, schedule, ...funcMetaRest } = funcMeta
    const name = HandlerFunc.name
    const mergedOptions = this.mergeFunctionDefaults(funcMetaRest)

    const handlerFunction = this.createLambdaFunction(name, resource, mergedOptions)

    // enable lambda integrations
    if (funcMeta.path) {
      if (!this.httpApi) throw new Error(`API paths defined but httpApi was not provided to ${this}`)

      // generate APIGW integration
      new ApiViewConstruct(this, `View-${name}-${this.viewCounter++}`, {
        ...mergedOptions,
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

      if (apiViewMeta.schedule)
        throw new Error("schedule is not supported on ApiView for now (it could be easily added if desired)")

      const handlerFunction = this.createLambdaFunction(name, resource, mergedOptions)

      if (!this.httpApi) throw new Error(`API paths defined but httpApi was not provided to ${this}`)

      apiViewConstruct = new ApiViewConstruct(this, `Class-${name}-${this.viewCounter++}`, {
        ...mergedOptions,
        handlerFunction,
        httpApi: this.httpApi,
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
        // TODO: do something with propertyKey and HandlerFunc
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  protected grantFunctionAccess(options: FunctionOptions, func: Function): void {
    // aurora data API access
    if (!options.grantDatabaseAccess || !this.databaseCluster) return

    const db = this.databaseCluster

    // if (!this.databaseCluster) throw new Error("grantDatabaseAccess is true but no databaseCluster is defined")

    // data API
    db.grantDataApiAccess(func)

    // network access
    db.connections.allowDefaultPortFrom(func)

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
    let fns = this.generatedFunctions
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
