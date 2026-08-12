// `react-native-dotenv` rewrites `@env` imports into inline values at build
// time. That rewrite depends on a real `.env` and breaks under Jest coverage
// instrumentation, so it runs only outside the `test` env — in tests, `@env`
// stays a normal import that jest's `moduleNameMapper` redirects to a stub
// (see `test/mocks/env.ts`). `module-resolver` stays top-level: the path
// aliases are needed in every environment, tests included.
const dotenv = [
  'module:react-native-dotenv',
  {
    moduleName: '@env',
    path: '.env',
    safe: false,
    allowUndefined: true,
  },
];

const moduleResolver = [
  'module-resolver',
  {
    root: ['./src'],
    extensions: [
      '.ios.ts',
      '.android.ts',
      '.ts',
      '.ios.tsx',
      '.android.tsx',
      '.tsx',
      '.jsx',
      '.js',
      '.json',
    ],
    alias: {
      '@app': './src/app',
      '@screens': './src/screens',
      '@features': './src/features',
      '@shared': './src/shared',
      '@wdk-internal': './node_modules/@tetherto/wdk-react-native-core/src',
    },
  },
];

module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [moduleResolver],
  env: {
    development: {
      plugins: [dotenv],
    },
    production: {
      plugins: [dotenv],
      // don't remove logs for debug purpose
      // not critical we never reach "prod" in reality
      // plugins: [dotenv, 'transform-remove-console'],
    },
  },
};
