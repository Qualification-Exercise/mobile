import { ANY_SECRET } from '@env';

export { wdkConfigs } from './wdk';
export { DEFAULT_BACKEND_API_URL, getBackendApiUrl } from './backend';

// Example: surface a value loaded from the .env file via react-native-dotenv.
export const anySecret = ANY_SECRET;
