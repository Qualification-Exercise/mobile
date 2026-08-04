import { useEffect } from 'react';
import { useWdkApp } from '@tetherto/wdk-react-native-core';
import { useStore } from '@shared/store';

export function useSyncWdkAppState() {
  const { state } = useWdkApp();
  const { wdkAppStore } = useStore();

  useEffect(() => {
    wdkAppStore.setState(state);
  }, [state, wdkAppStore]);
}
