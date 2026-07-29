const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

console.log(
  '\x1b[33m[dotenv] react-native-dotenv inlines env values at build time via Babel, ' +
    'so restart Metro with cache cleared (expo start -c) after changing .env — ' +
    'otherwise the old value stays baked in.\x1b[0m',
);

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
