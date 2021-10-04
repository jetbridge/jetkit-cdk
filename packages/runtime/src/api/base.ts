import HttpError, { notFound } from "@jdpnielsen/http-error"
import { APIGatewayProxyResultV2, Context, APIGatewayProxyEventV2 as ApiEvent } from "aws-lambda"
import { filename } from "dirname-filename-esm"
import {
  ApiMetadataMap,
  getApiViewMetadata,
  getSubRouteMetadata,
  IApiViewClassMetadata,
  ISubRouteApiMetadata,
  MetadataTarget,
} from "../metadata"
import { HttpMethod } from "../types"

/**
 * JetKit supports using API View classes to organize your RESTful endpoints.
 *
 * Requests for HTTP verbs (`get`, `post`, `delete`, etc...) will be automatically
 * dispatched to methods of the same name (lowercase) if defined.
 *
 * Custom routes chained off the route of the API View class can be defined
 * on methods of your API View class using {@link SubRoute}.
 *
 * To create a view, extend {@link ApiViewBase}, define handler methods,
 * export a {@link apiViewHandler} handler from the file containing your API View,
 * and pass the class to {@link ResourceGenerator}.
 *
 * @module
 */

/**
 * A view with method-based routing.
 *
 * Subclass {@link ApiViewBase} to define your own class-based API endpoints.
 *
 * Define sub-paths with {@link SubRoute}.
 *
 */
export class ApiViewBase {
  getMetadata(): IApiViewClassMetadata | undefined {
    return getApiViewMetadata(this.constructor as MetadataTarget)
  }

  /**
   * Look up appropriate method to handle an incoming request for this view.
   *
   * @param event API Gateway Proxy v2 Lambda event
   * @returns handler method to process request
   */
  findHandler(event: ApiEvent): ApiHandler | undefined {
    // figure out where to route `event`
    const method = event.requestContext.http.method as HttpMethod
    const routeKey = event.routeKey
    // get metadata
    const apiViewClass = this.constructor as MetadataTarget
    const viewMeta = this.getMetadata()
    const subRouteMetaMap = getSubRouteMetadata(apiViewClass)
    if (!viewMeta) throw new Error(`Metadata for dispatch not found on API view ${apiViewClass}`)
    if (!viewMeta.path) return undefined
    if (!subRouteMetaMap) throw new Error(`No @SubRoutes found on API view ${apiViewClass}`)

    // check if we match a @SubRoute path/methods
    const subRouteHandlerMethod = this.matchSubRoute(viewMeta, subRouteMetaMap, routeKey, method)
    if (subRouteHandlerMethod) return subRouteHandlerMethod

    return undefined
  }

  protected matchSubRoute(
    viewMeta: IApiViewClassMetadata,
    subRouteMetaMap: ApiMetadataMap<ISubRouteApiMetadata>,
    routeKey: string,
    method: HttpMethod
  ): ApiHandler | undefined {
    // given route key "POST /album/{albumId}/like"
    // we should match any subRoute with that configuration
    for (const meta of subRouteMetaMap.values()) {
      const { methods, path, HandlerFunc } = meta
      if (!viewMeta.path) return

      // full path is parent path + subRoute path
      const fullPath = viewMeta.path + (path || "")
      if (this.matchesRouteKey(routeKey, method, fullPath, methods)) return HandlerFunc as ApiHandler
    }

    return undefined
  }

  protected matchesRouteKey(routeKey: string, method: HttpMethod, path: string, methods?: HttpMethod[]): boolean {
    const matchAnyMethod = !methods || methods.includes(HttpMethod.ANY)
    method = method.toUpperCase() as HttpMethod

    // method match?
    if (!methods?.includes(method) && !matchAnyMethod) return false

    // routeKey to match e.g. "POST /album/{albumId}/like"
    const matchRouteKey = `${method} ${path}`
    const matchAnyRouteKey = `${HttpMethod.ANY} ${path}`

    // route key match?
    if (matchRouteKey === routeKey) return true

    // special case - ANY
    if (matchAnyMethod && matchAnyRouteKey === routeKey) return true

    return false
  }

  /**
   * Handle a request by dispatching to appropriate handler.
   *
   * @param event API Gateway Proxy v2 Lambda event
   * @param context Lambda invocation context
   */
  dispatch = async (event: ApiEvent, context: Context): ApiResponse => {
    const { http } = event.requestContext
    const { path, method } = http

    console.debug(`➠ ${method} ${path}`)

    // dispatch based on API Gateway Proxy V2 event
    try {
      // find method to call
      const handlerMethod = this.findHandler(event)
      if (handlerMethod) {
        // call handler
        return await handlerMethod.call(this, event, context)
      } else {
        // 404
        throw notFound(`The path ${method} ${path} was not found`)
      }
    } catch (ex) {
      // exception raised
      return this.handleDispatchError(ex)
    }
  }

  /**
   * Transform error caught during dispatch to an HTTP response.
   */
  protected handleDispatchError(ex: unknown): APIGatewayProxyResultV2 {
    if (ex instanceof HttpError) {
      // HTTP error handler
      console.warn(ex)
      return {
        statusCode: ex.statusCode,
        body: ex.message || ex.name,
      }
    }

    // unhandled exception
    // give up.
    throw ex
  }
}

// copied so return type of apiViewHandler doesn't need a type ref to jkcdk-metadata
type ApiResponse = Promise<APIGatewayProxyResultV2>
type ApiHandler = (event: ApiEvent, context: Context) => ApiResponse

/**
 * Helper function to generate a lambda handler for an {@link ApiViewBase} class.
 * It should be exported as `handler`. This is the default `handler` name used when generating
 * the lambda function. You may change it but be sure the exported name matches the
 * {@link IApiMetadata.handler} parameter.
 *
 * @param filename Should be `__filename`. Tells Lambda where to find your entrypoint
 * @param apiView A subclass of ApiViewBase
 * @returns Lambda entrypoint handler to dispatch to the appropriate view method
 *
 * @category Helper
 *
 * @example
 * ```typescript
 * export const handler = apiViewHandler(__filename, MyApiView)
 * ```
 */
export const apiViewHandler = (filename: string, apiView: typeof ApiViewBase): ApiHandler => {
  // add entry=filename to metadata
  const viewMeta = getApiViewMetadata(apiView)
  if (!viewMeta) throw new Error(`apiViewHandler() called on ${apiView} but it is not decorated with @ApiView`)

  if (!viewMeta.entry && filename) viewMeta.entry = filename

  return new apiView().dispatch
}

/**
 * Helper function to generate a lambda handler for an {@link ApiViewBase} class.
 * It should be exported as `handler`. This is the default `handler` name used when generating
 * the lambda function. You may change it but be sure the exported name matches the
 * {@link IApiMetadata.handler} parameter.
 *
 * @param importMeta Should be `import.meta`. Tells Lambda where to find your entrypoint
 * @param apiView A subclass of ApiViewBase
 * @returns Lambda entrypoint handler to dispatch to the appropriate view method
 *
 * @category Helper
 *
 * @example
 * ```typescript
 * export const handler = apiViewHandler(import.meta, MyApiView)
 * ```
 */
export const apiViewHandlerEs = (importMeta: ImportMeta, apiView: typeof ApiViewBase): ApiHandler => {
  // add entry=filename to metadata
  const viewMeta = getApiViewMetadata(apiView)
  if (!viewMeta) throw new Error(`apiViewHandler() called on ${apiView} but it is not decorated with @ApiView`)

  if (!viewMeta.entry && filename) viewMeta.entry = filename(importMeta)

  return new apiView().dispatch
}
