import HttpError, { methodNotAllowed, notFound } from "@jdpnielsen/http-error"
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2, Context } from "aws-lambda"
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
export { APIGatewayProxyEventV2 as APIEvent }

/**
 * Type of an API request handler.
 *
 * @category Helper
 */
export type RequestHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyResultV2>

async function raiseNotAllowed(event: APIGatewayProxyEventV2) {
  throw methodNotAllowed(`${event.requestContext.http.method.toUpperCase()} not allowed`)
  return "error"
}

/**
 * A view with method-based routing.
 *
 * Subclass APIView to define your own class-based API endpoints.
 *
 * Methods with HTTP verb names (get, post, patch, etc) are called.
 * Define custom sub-paths with @SubRoute().
 *
 * @example
 * ```typescript
 * @ApiView({
 *   path: "/album",
 *   memorySize: 512,
 *   environment: {
 *     LOG_LEVEL: "DEBUG",
 *   },
 * })
 * export class AlbumApi extends ApiViewBase {
 *   // custom endpoint in the view
 *   @SubRoute({
 *     path: "/{albumId}/like",  // will be /album/123/like
 *     methods: [HttpMethod.POST, HttpMethod.DELETE],
 *   })
 *   async like(event: APIEvent) {
 *     const albumId = event.pathParameters?.albumId
 *     if (!albumId) throw badRequest("albumId is required in path")
 *
 *     const method = event.requestContext.http.method
 *
 *     // POST - mark album as liked
 *     if (method == HttpMethod.POST) return `Liked album ${albumId}`
 *     // DELETE - unmark album as liked
 *     else if (method == HttpMethod.DELETE) return `Unliked album ${albumId}`
 *     else return methodNotAllowed()
 *   }
 *
 *   // define POST handler
 *   post: APIGatewayProxyHandlerV2 = async () => "Created new album"
 * }
 * export const handler = apiViewHandler(MyApiView)
 * ```
 */
export class ApiViewBase {
  routeMethodMap?: Map<string, RequestHandler>

  get: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event)
  post: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event)
  put: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event)
  patch: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event)
  delete: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event)

  /**
   * Look up appropriate method to handle an incoming request for this view.
   *
   *
   *
   * @param event API Gateway Proxy v2 Lambda event
   * @returns handler method to process request
   */
  protected findHandler(event: APIGatewayProxyEventV2): RequestHandler | undefined {
    const httpContext = event.requestContext.http
    const httpMethod = httpContext.method.toLowerCase()
    const { path } = httpContext
    console.log("ROUTE KEY", path)

    // do fancy dispatching...
    // either via route decorator or function name
    console.log(`route method map on ${this}:`, this.routeMethodMap)
    if (this.routeMethodMap) {
      const routeHandlerMethod = this.routeMethodMap.get(path)
      console.log("found routeHandlerMethod", routeHandlerMethod)

      if (routeHandlerMethod) return routeHandlerMethod
    }

    // look up handler based on method
    if (safeHas(httpMethod, this)) {
      return this[httpMethod]
    }

    return undefined
  }

  /**
   * Handle a request by dispatching to appropriate handler.
   *
   * @param event API Gateway Proxy v2 Lambda event
   * @param context Lambda invocation context
   */
  dispatch = async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> => {
    const { http } = event.requestContext
    const { path, method } = http

    console.debug(`➠ ${method} ${path}`)

    try {
      const handlerMethod = this.findHandler(event)
      console.log("handlermethod", handlerMethod)

      if (handlerMethod) {
        return await handlerMethod(event, context)
      } else {
        throw notFound(`The path ${path} was not found`)
      }
    } catch (ex) {
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
 * Helper function to generate a lambda handler for an {@link ApiView} class.
 * It should be exported as `handler`. This is the default `handler` name used when generating
 * the lambda function. You may change it but be sure the exported name matches the
 * {@link IApiMetadata.handler} parameter.
 *
 * @param apiView A subclass of ApiViewBase
 * @returns Lambda entrypoint handler to dispatch to the appropriate view method
 *
 * @category Helper
 *
 * @example
 * ```typescript
 * export const handler = apiViewHandler(MyApiView)
 * ```
 */
export const apiViewHandler = (apiView: typeof ApiViewBase): RequestHandler => new apiView().dispatch
