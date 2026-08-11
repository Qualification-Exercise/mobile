declare module '@env' {
  export const GOOGLE_WEB_CLIENT_ID: string;
  export const GOOGLE_IOS_CLIENT_ID: string;
  export const API_BASE_URL: string | undefined;
  // TronGrid credentials. Optional, but without a key Tron runs on the
  // anonymous tier whose rate limit is low enough that balance polling gets
  // 429'd — see src/shared/config/wdk.ts.
  export const TRON_API_KEY: string | undefined;
  export const TRON_API_SECRET: string | undefined;
}
