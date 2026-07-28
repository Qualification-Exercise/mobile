import { createContext, useContext } from 'react';
import type { RootStore } from '@app/providers';

export const RootStoreContext = createContext<RootStore | null>(null);

export const useStore = () => {
  const store = useContext(RootStoreContext);
  if (!store) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return store;
};
