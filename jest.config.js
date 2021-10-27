export default {
  // extensionsToTreatAsEsm: [".ts"],
  // preset: "ts-jest",
  preset: "ts-jest/presets/default-esm",
  // preset: "ts-jest/presets/js-with-ts-esm",
  // moduleDirectories: ["node_modules", "<rootDir>/packages/runtime/src"],
  // moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/__tests__/**/*.+(ts)", "**/?(*.)+(test).+(ts)"],

  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
}
