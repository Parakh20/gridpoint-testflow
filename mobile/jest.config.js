module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // packages/shared/ has no node_modules of its own (see metro.config.js's
  // matching nodeModulesPaths fix for the Metro bundler) — without this,
  // Jest's Node-style resolution walks up from packages/shared/src and never
  // finds @babel/runtime, breaking any test that actually executes
  // @testflow/shared code (not just type-only imports of it).
  modulePaths: ['<rootDir>/node_modules'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@testflow/shared$': '<rootDir>/../packages/shared/src',
    '^@testflow/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core)/)',
  ],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/hooks/**/*.ts', '!src/lib/**/*.d.ts'],
};
