import type { ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useWalletManager,
  useWdkApp,
  WdkAppProvider,
} from '@tetherto/wdk-react-native-core';
import {
  DEFAULT_WALLET_ID,
  WalletBootSync,
  WdkSeedPhraseBridge,
} from '@features/wallet-seed-phrase';
import { useStore } from '@shared/store';
import { requireWalletBiometry } from '@shared/lib';
import { wdkConfigs } from '@shared/config/wdk';
import { bundle } from '../../../.wdk';

type WdkProviderProps = {
  children: ReactNode;
};

const WdkGate = observer(function WdkGateView({ children }: WdkProviderProps) {
  const { state, retry } = useWdkApp();
  const { wallets } = useWalletManager();
  const { biometryStore, walletSeedPhraseStore } = useStore();

  const hasPersistedWallet = wallets.some(
    wallet => wallet.identifier === DEFAULT_WALLET_ID && wallet.exists,
  );

  async function unlockWallet() {
    const verified = await requireWalletBiometry(
      biometryStore,
      'Unlock wallet',
    );
    if (!verified) {
      return;
    }

    walletSeedPhraseStore.skipBootUnlock = false;
    walletSeedPhraseStore.unlockWalletRequest.error = '';
    void walletSeedPhraseStore.unlockWalletRequest.fetch(
      state.status === 'LOCKED' ? state.walletId : DEFAULT_WALLET_ID,
    );
  }

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

  if (state.status === 'LOCKED') {
    if (!hasPersistedWallet) {
      return children;
    }

    if (walletSeedPhraseStore.unlockWalletRequest.loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#009393" />
          <Text style={styles.message}>Unlocking wallet…</Text>
        </View>
      );
    }

    if (walletSeedPhraseStore.unlockWalletRequest.error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.title}>Could not unlock wallet</Text>
          <Text style={styles.message}>
            {walletSeedPhraseStore.unlockWalletRequest.error}
          </Text>
          <Pressable style={styles.button} onPress={unlockWallet}>
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Wallet locked</Text>
        <Text style={styles.message}>
          Verify your identity to unlock your wallet.
        </Text>
        <Pressable style={styles.button} onPress={unlockWallet}>
          <Text style={styles.buttonLabel}>Unlock wallet</Text>
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
      <WalletBootSync />
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
