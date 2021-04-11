import { methodNotAllowed } from "@jdpnielsen/http-error";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { WrappableConstructor } from "../registry";
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
}
