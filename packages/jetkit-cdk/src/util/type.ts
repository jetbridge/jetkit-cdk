import { RequestHandler } from "../api/crud";

export const safeHas = <K extends string>(
  key: K,
  x: Record<string, unknown>
): x is { [key in K]: RequestHandler } => key in x;
