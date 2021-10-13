export const debug = (...args: unknown[]) => {
  process.env.DEBUG && console.debug.apply(args)
}
