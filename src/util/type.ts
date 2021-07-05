import { ApiHandler } from "../api/base"

export const safeHas = <K extends string>(
  key: K,
  // eslint-disable-next-line @typescript-eslint/ban-types
  x: object
): x is { [key in K]: ApiHandler } => key in x
