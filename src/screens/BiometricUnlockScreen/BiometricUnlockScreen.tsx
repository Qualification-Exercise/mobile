import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useWdkApp, useWalletManager } from '@tetherto/wdk-react-native-core';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { hasPersistedWallet } from '@features/wallet-seed-phrase/walletPresence';
import { ScreenContainer } from '@shared/ui';
import { useStore } from '@shared/store';
import { UnlockBiometric } from '@features/unlock-biometric';

export function BiometricUnlockScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { params } =
    useRoute<RouteProp<RootStackParamList, 'BiometricUnlock'>>();
  const { state } = useWdkApp();
  const { wallets } = useWalletManager();
  const { walletSeedPhraseStore } = useStore();
  const autoPrompt = params?.autoPrompt ?? true;
  const persistedWalletExists = hasPersistedWallet(wallets);

  async function handleUnlocked() {
    const needsWalletUnlock = persistedWalletExists && state.status !== 'READY';

    if (needsWalletUnlock) {
      const opened = await walletSeedPhraseStore.openExistingWallet();
      if (!opened) {
        return;
      }
    }

    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <ScreenContainer>
      <UnlockBiometric autoPrompt={autoPrompt} onUnlocked={handleUnlocked} />
    </ScreenContainer>
  );
}
