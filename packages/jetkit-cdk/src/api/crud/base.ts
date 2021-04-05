import HttpError, { methodNotAllowed, notFound } from "@jdpnielsen/http-error";
import {
  APIGatewayProxyHandlerV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { debug } from "console";
import { safeHas } from "../../util/type";

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

export class CrudApiBase {
  get: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  post: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  put: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  patch: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);
  delete: APIGatewayProxyHandlerV2 = async (event) => raiseNotAllowed(event);

  routeMethodMap: Map<string, RequestHandler>;

  constructor() {
    this.routeMethodMap = new Map();
  }

  protected findHandler(
    event: APIGatewayProxyEventV2
  ): RequestHandler | undefined {
    const httpMethod = event.requestContext.http.method.toLowerCase();

    // do fancy dispatching...
    // either via route decorator or function name

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
    const { path } = http;
    const route = event.requestContext.routeKey;

    debug("Route key:", route, "path:", path);

    try {
      const handlerMethod = this.findHandler(event);
      if (handlerMethod) {
        return handlerMethod(event, context);
      } else {
        return notFound(`The path ${path} was not found`);
      }
    } catch (ex) {
      return this.handleDispatchError(ex);
    }
  };

  /**
   * Transform error caught during dispatch to an HTTP response.
   */
  protected handleDispatchError(ex: Error): APIGatewayProxyResultV2 {
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
