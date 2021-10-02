export const debug = (...args: any[]) => {
  process.env.DEBUG && console.debug.apply(args)
}
