import HttpError, { notFound, notImplemented } from "@jdpnielsen/http-error";
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

export class CrudApiBase {
  get: APIGatewayProxyHandlerV2 = async (event) => {
    throw notImplemented("Get not implemented");
  };

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
    const { method, path, sourceIp } = http;
    const route = event.requestContext.routeKey;

    debug("Route key:", route, "path:", path);

    try {
      if (has(method, this)) {
        return this[method](event, context);
      }

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
