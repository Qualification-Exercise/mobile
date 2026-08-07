import { Platform } from 'react-native';
import { ANY_SECRET, API_BASE_URL } from '@env';

export { wdkConfigs } from './wdk';
export {
  SUPPORTED_ASSETS,
  SUPPORTED_NETWORKS,
  getAssetConfig,
  getAsset,
  getFeeToken,
  getSrcChainId,
} from './assets';
export type { SupportedAssetConfig, FeeToken } from './assets';

// Example: surface a value loaded from the .env file via react-native-dotenv.
export const anySecret = ANY_SECRET;

// Base URL for the WDK backend auth API. The `/api` global prefix is baked in.
//
// Resolution order:
//   1. `API_BASE_URL` from `@env` when set;
//   2. a platform-aware emulator default. `10.0.2.2` is the Android emulator's
//      alias for the host loopback; the iOS simulator shares the host's
//      `localhost`. A physical device can reach neither and must set
//      `API_BASE_URL` to the host machine's LAN IP.
export const apiBaseUrl: string =
  API_BASE_URL ??
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api');
