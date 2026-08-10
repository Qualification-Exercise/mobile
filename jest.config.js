module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/test/setup.ts'],
  clearMocks: true,
  moduleNameMapper: {
    '^mobx-react-lite$': 'mobx-react-lite/es/index.js',
    // `@env` is normally rewritten by react-native-dotenv, which is disabled in
    // the test babel env — resolve it to a deterministic stub instead.
    '^@env$': '<rootDir>/test/mocks/env.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-.*|mobx-react-lite)/)',
  ],
  // Coverage is enforced on the business-logic layers only. Screens, UI,
  // app-root, barrels, type files, the static WDK config object, and the
  // WDK-SDK-glue hooks are intentionally excluded (see docs/test-coverage-plan.md).
  collectCoverageFrom: [
    'src/shared/lib/**/*.{ts,tsx}',
    'src/shared/api/**/*.{ts,tsx}',
    'src/shared/store/**/*.{ts,tsx}',
    'src/shared/config/**/*.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
    '!src/shared/config/wdk.ts',
    '!src/shared/lib/hooks/wallet/**',
    '!src/shared/lib/installGlobalErrorHandlers.ts',
    // Type-only modules (no runtime code) and React-context glue.
    '!src/shared/api/types.ts',
    '!src/shared/store/models/asset/Asset.ts',
    '!src/shared/store/models/wallet/Wallet.ts',
    '!src/shared/store/useStores.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
