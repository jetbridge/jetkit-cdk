import { methodNotAllowed } from "@jdpnielsen/http-error";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { safeHas } from "../util/type";

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

export class ApiBase {
  routeMethodMap?: Map<string, RequestHandler>;

  get: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  post: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  put: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  patch: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  delete: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);

  protected findHandler(
    event: APIGatewayProxyEventV2
  ): RequestHandler | undefined {
    const httpContext = event.requestContext.http;
    const httpMethod = httpContext.method.toLowerCase();
    const route = event.requestContext.routeKey;
    console.log("ROUTE KEY", route);

    // do fancy dispatching...
    // either via route decorator or function name
    console.log(`route method map on ${this}:`, this.routeMethodMap);
    if (this.routeMethodMap) {
      const routeHandlerMethod = this.routeMethodMap.get(route);
      console.log("found routeHandlerMethod", routeHandlerMethod);

      if (routeHandlerMethod) return routeHandlerMethod;
    }

    // look up handler based on method
    if (safeHas(httpMethod, this)) {
      return this[httpMethod];
    }

    return undefined;
  }
}
