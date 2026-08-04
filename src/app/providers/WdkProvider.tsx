import type { ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWdkApp, WdkAppProvider } from '@tetherto/wdk-react-native-core';
import { WdkSeedPhraseBridge } from '@features/wallet-seed-phrase';
import { wdkConfigs } from '@shared/config/wdk';
import { bundle } from '../../../.wdk';
import { useSyncAppState } from './useSyncAppState';
import { useSyncWdkAppState } from './useSyncWdkAppState';

type WdkProviderProps = {
  children: ReactNode;
};

const WdkGate = observer(function WdkGateView({ children }: WdkProviderProps) {
  const { state, retry } = useWdkApp();

  // FIXME: Move away
  useSyncWdkAppState();
  useSyncAppState();

  if (state.status === 'INITIALIZING' || state.status === 'REINITIALIZING') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#009393" />
        <Text style={styles.message}>Starting wallet runtime…</Text>
      </View>
    );
  }

  if (state.status === 'ERROR') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Wallet runtime error</Text>
        <Text style={styles.message}>{state.error.message}</Text>
        <Pressable style={styles.button} onPress={retry}>
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return children;
});

export function WdkProvider({ children }: WdkProviderProps) {
  return (
    <WdkAppProvider bundle={{ bundle }} wdkConfigs={wdkConfigs}>
      <WdkSeedPhraseBridge />
      <WdkGate>{children}</WdkGate>
    </WdkAppProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f0e',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: '#9aa3a1',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#009393',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
