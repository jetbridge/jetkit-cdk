import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import HttpError, { methodNotAllowed, notFound } from "@jdpnielsen/http-error"
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda"
import { ApiEvent } from ".."
import {
  ApiMetadataMap,
  getApiViewMetadata,
  getSubRouteMetadata,
  IApiViewClassMetadata,
  ISubRouteApiMetadata,
  MetadataTarget,
} from "../metadata"
import { safeHas } from "../util/type"

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
 * HTTP request payload.
 *
 * @category Helper
 */
export { APIGatewayProxyEventV2 as ApiEvent }
/**
 * Valid reponse types from a {@link RequestHandler}.
 */
export type ApiResponse = Promise<APIGatewayProxyResultV2>

/**
 * Type of an API request handler.
 *
 * @category Helper
 */
export type RequestHandler = (event: ApiEvent, context: Context) => ApiResponse

async function raiseNotAllowed(event: ApiEvent) {
  throw methodNotAllowed(`${event.requestContext.http.method.toUpperCase()} not allowed`)
  return "error"
}

/**
 * A view with method-based routing.
 *
 * Subclass {@link ApiViewBase} to define your own class-based API endpoints.
 *
 * Methods with HTTP verb names (get, post, patch, etc) are called automatically.
 * Define custom sub-paths with {@link SubRoute}.
 *
 */
export class ApiViewBase {
  get: RequestHandler = async (event) => raiseNotAllowed(event)
  post: RequestHandler = async (event) => raiseNotAllowed(event)
  put: RequestHandler = async (event) => raiseNotAllowed(event)
  patch: RequestHandler = async (event) => raiseNotAllowed(event)
  delete: RequestHandler = async (event) => raiseNotAllowed(event)
  head: RequestHandler = async (event) => raiseNotAllowed(event)
  options: RequestHandler = async (event) => raiseNotAllowed(event)

  /**
   * Look up appropriate method to handle an incoming request for this view.
   *
   * @param event API Gateway Proxy v2 Lambda event
   * @returns handler method to process request
   */
  findHandler(event: ApiEvent): RequestHandler | undefined {
    // figure out where to route `event`
    const method = event.requestContext.http.method as HttpMethod
    const routeKey = event.routeKey
    // get metadata
    const apiViewClass = this.constructor as MetadataTarget
    const viewMeta = getApiViewMetadata(apiViewClass)
    const subRouteMetaMap = getSubRouteMetadata(apiViewClass)
    if (!viewMeta) throw new Error(`Metadata for dispatch not found on API view ${apiViewClass}`)

    // is this request for the default view or a sub route?
    // does the route key match the base route?
    if (this.matchesRouteKey(routeKey, method, viewMeta.path, viewMeta.methods)) {
      // get(), post(), etc
      const verbHandler = this.matchHttpVerbMethod(method)
      if (verbHandler) return verbHandler
    } else {
      // try to match a @SubRoute
      if (subRouteMetaMap) {
        const subRouteHandlerMethod = this.matchSubRoute(viewMeta, subRouteMetaMap, routeKey, method)
        if (subRouteHandlerMethod) return subRouteHandlerMethod
      }
    }

    return undefined
  }

  protected matchHttpVerbMethod(method: HttpMethod): RequestHandler | undefined {
    // look up handler based on HTTP verb e.g. this.post()
    method = method.toLowerCase() as HttpMethod
    if (safeHas(method, this)) {
      return this[method]
    }
    return undefined
  }

  protected matchSubRoute(
    viewMeta: IApiViewClassMetadata,
    subRouteMetaMap: ApiMetadataMap<ISubRouteApiMetadata>,
    routeKey: string,
    method: HttpMethod
  ): RequestHandler | undefined {
    // given route key "POST /album/{albumId}/like"
    // we should match any subRoute with that configuration
    for (const meta of subRouteMetaMap.values()) {
      const { methods, path, requestHandlerFunc } = meta
      // full path is parent path + subRoute path
      const fullPath = viewMeta.path + path
      if (this.matchesRouteKey(routeKey, method, fullPath, methods)) return requestHandlerFunc
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
    const matchAnyRouteKey = matchRouteKey.replace(method, HttpMethod.ANY)

    // route key match?
    if (matchRouteKey === routeKey) return true

    // special case - ANY
    if (matchAnyMethod && matchAnyRouteKey == `${HttpMethod.ANY} ${routeKey}`) return true

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
        return await handlerMethod(event, context)
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
  protected handleDispatchError(ex: Error): APIGatewayProxyResultV2 {
    if (ex instanceof HttpError) {
      // HTTP error handler
      console.warn(ex)
      return {
        statusCode: ex.statusCode,
        body: ex.message || ex.name,
      }
    }

    // unhandled exception
    console.error(ex)
    return {
      statusCode: 500,
    }
  }
}

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
export const apiViewHandler = (filename: string, apiView: typeof ApiViewBase): RequestHandler => {
  // add entry=filename to metadata
  const viewMeta = getApiViewMetadata(apiView)
  if (!viewMeta) throw new Error(`apiViewHandler() called on ${apiView} but it is not decorated with @ApiView`)

  if (!viewMeta.entry && filename) viewMeta.entry = filename

  return new apiView().dispatch
}
