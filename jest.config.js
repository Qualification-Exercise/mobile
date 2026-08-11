module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^mobx-react-lite$': 'mobx-react-lite/es/index.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-.*|mobx-react-lite)/)',
  ],
};
