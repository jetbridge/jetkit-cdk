/**
 * This is all currently unused. Unclear if there is a need for it.
 *
 * Make it easy to load a well-defined configuration and make it available conveniently.
 *
 * @module
 */

// currently unused
export interface IConfigGeneric {}

export type IConfig<T = Record<string | number | symbol, unknown>> = IConfigGeneric & T
