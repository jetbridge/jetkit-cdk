module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js"],
  moduleNameMapper: {
    // Mocks out all these file formats when tests are run
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "identity-obj-proxy",
  },
  roots: ["./src"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
  testMatch: ["**/__tests__/**/*.+(ts|tsx)", "**/?(*.)+(spec|test).+(ts|tsx)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|ts|tsx)$"],
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/node_modules/**", "!**/vendor/**"],
}
