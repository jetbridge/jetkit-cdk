import HttpError, { methodNotAllowed, notFound } from "@jdpnielsen/http-error";
import {
  APIGatewayProxyHandlerV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { debug } from "console";

type RequestHandler = (
  event: APIGatewayProxyEventV2,
  context?: Context
) => Promise<APIGatewayProxyResultV2>;

// TODO: move to utils
const has = <K extends string>(
  key: K,
  x: object
): x is { [key in K]: RequestHandler } => key in x;

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
    let { method, path, sourceIp } = http;
    const route = event.requestContext.routeKey;

    method = method.toLowerCase();
    debug("Route key:", route, "path:", path, "method: ", method);

    try {
      // look up handler based on method
      if (has(method, this)) {
        return this[method](event, context);
      }

      // do fancier dispatching...
      // either via route decorator or function name

      return notFound(`The path ${path} was not found`);
    } catch (ex) {
      if (ex instanceof HttpError) {
        // HTTP error handler
        console.warn(ex);
        return {
          statusCode: ex.statusCode,
          body: ex.message || ex.name,
        };
      } else {
        // unhandled exception
        console.error(ex);
        return {
          statusCode: 500,
        };
      }
    }
  };
}
