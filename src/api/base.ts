import HttpError, { methodNotAllowed, notFound } from "@jdpnielsen/http-error";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { safeHas } from "../util/type";

// HTTP request payload
export { APIGatewayProxyEventV2 as APIEvent };

export type RequestHandler = (
  event: APIGatewayProxyEventV2,
  context?: Context
) => Promise<APIGatewayProxyResultV2>;

async function raiseNotAllowed(event: APIGatewayProxyEventV2) {
  throw methodNotAllowed(
    `${event.requestContext.http.method.toUpperCase()} not allowed`
  );
  return "error";
}

/**
 * A view with method-based routing.
 *
 * Subclass APIView to define your own class-based API endpoints.
 *
 * Methods with HTTP verb names (get, post, patch, etc) are called.
 * Define custom sub-paths with @SubRoute().
 */
export class ApiView {
  routeMethodMap?: Map<string, RequestHandler>;

  get: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  post: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  put: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  patch: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  delete: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);

  findHandler(event: APIGatewayProxyEventV2): RequestHandler | undefined {
    const httpContext = event.requestContext.http;
    const httpMethod = httpContext.method.toLowerCase();
    const { path } = httpContext;
    console.log("ROUTE KEY", path);

    // do fancy dispatching...
    // either via route decorator or function name
    console.log(`route method map on ${this}:`, this.routeMethodMap);
    if (this.routeMethodMap) {
      const routeHandlerMethod = this.routeMethodMap.get(path);
      console.log("found routeHandlerMethod", routeHandlerMethod);

      if (routeHandlerMethod) return routeHandlerMethod;
    }

    // look up handler based on method
    if (safeHas(httpMethod, this)) {
      return this[httpMethod];
    }

    return undefined;
  }

  /**
   * Handle a request by dispatching to appropriate handler.
   *
   * @param event APIGW Lambda event
   */
  dispatch = async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2> => {
    const { http } = event.requestContext;
    const { path, method } = http;

    console.debug(`➠ ${method} ${path}`);

    try {
      const handlerMethod = this.findHandler(event);
      console.log("handlermethod", handlerMethod);

      if (handlerMethod) {
        return await handlerMethod(event, context);
      } else {
        throw notFound(`The path ${path} was not found`);
      }
    } catch (ex) {
      return this.handleDispatchError(ex);
    }
  };

  /**
   * Transform error caught during dispatch to an HTTP response.
   */
  handleDispatchError(ex: Error): APIGatewayProxyResultV2 {
    if (ex instanceof HttpError) {
      // HTTP error handler
      console.warn(ex);
      return {
        statusCode: ex.statusCode,
        body: ex.message || ex.name,
      };
    }

    // unhandled exception
    console.error(ex);
    return {
      statusCode: 500,
    };
  }
}
