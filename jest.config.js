import { defaults } from "jest-config"

export default {
  // extensionsToTreatAsEsm: [".ts"],
  // preset: "ts-jest",
  preset: "ts-jest/presets/default-esm",
  // preset: "ts-jest/presets/js-with-ts-esm",
  // moduleDirectories: ["node_modules", "<rootDir>/packages/runtime/src"],
  // moduleFileExtensions: ["ts", "js", "json"],
  // roots: [
  // "<rootDir>/packages/cdk/src",
  // "<rootDir>/packages/cdk/src",
  // "<rootDir>/packages/cdk/build",
  // "<rootDir>/packages/runtime/src",
  // "<rootDir>/packages/runtime/build/esm",
  // ],
  testMatch: ["**/__tests__/**/*.+(ts)", "**/?(*.)+(test).+(ts)"],

  globals: {
    "ts-jest": {
      // tsconfig: "tsconfig-cjs.json",
      useESM: true,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
}
