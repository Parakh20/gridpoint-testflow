module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
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
