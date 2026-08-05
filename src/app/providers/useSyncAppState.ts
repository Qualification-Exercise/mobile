import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useStore } from '@shared/store';

export function useSyncAppState() {
  const { appStateStore } = useStore();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextStatus: AppStateStatus) => {
        appStateStore.setStateChange(nextStatus);
      },
    );

    return () => subscription.remove();
  }, [appStateStore]);
}
