import { APIGatewayProxyEventV2 as ApiEvent, APIGatewayProxyResultV2, Context } from "aws-lambda"

export class ApiViewMetaBase {}

export enum HttpMethod {
  ANY = "ANY",
  DELETE = "DELETE",
  GET = "GET",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
  PATCH = "PATCH",
  POST = "POST",
  PUT = "PUT",
}

/**
 * Valid reponse types from a {@link ApiHandler}.
 */
type ApiResponse = Promise<APIGatewayProxyResultV2>

/**
 * Type of an API request handler.
 *
 * @category Helper
 */
type ApiHandler = (event: ApiEvent, context: Context) => ApiResponse
export { ApiEvent, ApiResponse, ApiHandler }
