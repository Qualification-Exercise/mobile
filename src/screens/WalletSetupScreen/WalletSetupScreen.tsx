import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { hasPersistedWallet } from '@features/wallet-seed-phrase/walletPresence';
import { ScreenContainer } from '@shared/ui';
import { WalletSetup } from '@features/wallet-setup';

export function WalletSetupScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { wallets } = useWalletManager();
  const redirectedRef = useRef(false);
  const persistedWalletExists = hasPersistedWallet(wallets);

  useEffect(() => {
    if (!persistedWalletExists || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: 'BiometricUnlock', params: { autoPrompt: true } }],
    });
  }, [persistedWalletExists, navigation]);

  if (persistedWalletExists) {
    return null;
  }

  return (
    <ScreenContainer>
      <WalletSetup
        onCreateWallet={() =>
          navigation.reset({ index: 0, routes: [{ name: 'RecoveryPhrase' }] })
        }
        onRestoreWallet={() => navigation.navigate('RestoreWallet')}
      />
    </ScreenContainer>
  );
}
