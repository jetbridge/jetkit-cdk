import { defaults } from "jest-config"

export default {
    preset: 'ts-jest/presets/default-esm', // or other ESM presets
  // moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx", "js"],
  roots: ["./packages"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      useESM: true,
    },
  },
  testMatch: ["**/__tests__/**/*.+(ts|tsx)", "**/?(*.)+(spec|test).+(ts|tsx)"],
  // transform: {
    // "^.+\\.tsx?$": "ts-jest",
  // },
  // transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|ts|tsx)$"],
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/node_modules/**", "!**/vendor/**"],
  // extensionsToTreatAsEsm: [...defaults.extensionsToTreatAsEsm, ".ts"],
    // moduleNameMapper: {
        // '^(\\.{1,2}/.*)\\.js$': '$1',
    // },
}
