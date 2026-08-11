// Test-time stand-in for the `@env` virtual module. In non-test builds
// `react-native-dotenv` rewrites `@env` imports into inline `.env` values; in
// tests the dotenv plugin is disabled (see `babel.config.js`) and jest maps
// `@env` here instead, so config code has deterministic values to read.
export const ANY_SECRET = 'test-secret';
export const API_BASE_URL = 'http://localhost:3000/api';
export const TRON_API_KEY = '';
export const TRON_API_SECRET = '';
export const GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
export const GOOGLE_IOS_CLIENT_ID = 'test-ios-client-id';
