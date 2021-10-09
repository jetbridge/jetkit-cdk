import { defaults } from "jest-config"

export default {
    preset: "ts-jest/presets/js-with-ts-esm", // or other ESM presets
  // moduleFileExtensions: [...defaults.moduleFileExtensions, "ts"],
  roots: ["./packages"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      useESM: true,
    },
  },
  testMatch: ["**/__tests__/**/*.+(ts|tsx)", "**/?(*.)+(spec|test).+(ts|tsx)"],
    modulePathIgnorePatterns: ["build/"],
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/node_modules/**", "!**/vendor/**"],
  // extensionsToTreatAsEsm: [...defaults.extensionsToTreatAsEsm, ".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
}
