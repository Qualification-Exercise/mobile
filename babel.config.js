module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    [
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
    ],
  ],
  env: {
    production: {
      plugins: [
        'transform-remove-console',
      ],
    },
  },
};
