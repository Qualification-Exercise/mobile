import { httpClient, toApiError } from './httpClient';
import type {
  GetEntropyResponse,
  GetSeedResponse,
  SecretItem,
  StoreEntropyRequest,
  StoreSeedRequest,
} from './types';

export const secretsApi = {
  async storeEntropy(body: StoreEntropyRequest): Promise<void> {
    try {
      await httpClient.post('/secrets/entropy', body);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getEntropy(): Promise<SecretItem | null> {
    try {
      const { data } = await httpClient.get<GetEntropyResponse>(
        '/secrets/entropy',
      );
      return data.entropies[0] ?? null;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async storeSeed(body: StoreSeedRequest): Promise<void> {
    try {
      await httpClient.post('/secrets/seed', body);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getSeed(): Promise<SecretItem | null> {
    try {
      const { data } = await httpClient.get<GetSeedResponse>('/secrets/seed');
      return data.seeds[0] ?? null;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
