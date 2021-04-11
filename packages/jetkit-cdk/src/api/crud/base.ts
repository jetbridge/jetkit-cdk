import HttpError, { notFound } from "@jdpnielsen/http-error";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { debug } from "console";
import { WrappableConstructor } from "../../registry";
import { ApiBase } from "../base";

export class CrudApiBase extends ApiBase {
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

    debug(`➠ ${method} ${path}`);

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
