import { defaults } from "jest-config"

export default {
  extensionsToTreatAsEsm: [".ts"],
  preset: "ts-jest/presets/js-with-ts-esm", // or other ESM presets
  moduleDirectories: ["node_modules", "<rootDir>/packages/runtime/src"],
  // moduleFileExtensions: ["ts", "js", "json"],
  // roots: [
    // "<rootDir>/packages/cdk/src",
    // "<rootDir>/packages/cdk/src",
    // "<rootDir>/packages/cdk/build",
    // "<rootDir>/packages/runtime/src",
    // "<rootDir>/packages/runtime/build",
  // ],
  globals: {
    "ts-jest": {
      // tsconfig: "tsconfig.json",
      useESM: true,
    },
  },
  testMatch: ["**/__tests__/**/*.+(ts)", "**/?(*.)+(test).+(ts)"],
  // modulePathIgnorePatterns: ["build/"],
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/node_modules/**", "!**/vendor/**"],
  // extensionsToTreatAsEsm: [...defaults.extensionsToTreatAsEsm, ".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
}
