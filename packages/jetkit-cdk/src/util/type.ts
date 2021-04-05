import { RequestHandler } from "../api/crud";

export const safeHas = <K extends string>(
  key: K,
  // eslint-disable-next-line @typescript-eslint/ban-types
  x: object
): x is { [key in K]: RequestHandler } => key in x;
