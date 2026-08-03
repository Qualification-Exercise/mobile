import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID } from '@features/wallet-seed-phrase';
import { useStore } from '@shared/store';
import { requireWalletBiometry } from '@shared/lib';
import { AssetDetailScreen } from '@screens/AssetDetailScreen';
import { ApproveTransactionScreen } from '@screens/ApproveTransactionScreen';
import { BiometricUnlockScreen } from '@screens/BiometricUnlockScreen';
import { ClaimCouponScreen } from '@screens/ClaimCouponScreen';
import { EnableBiometricScreen } from '@screens/EnableBiometricScreen';
import { HomeScreen } from '@screens/HomeScreen';
import { PaymentSuccessScreen } from '@screens/PaymentSuccessScreen';
import { ReceiveScreen } from '@screens/ReceiveScreen';
import { RecoveryPhraseScreen } from '@screens/RecoveryPhraseScreen';
import { RestoreWalletScreen } from '@screens/RestoreWalletScreen';
import { RewardsScreen } from '@screens/RewardsScreen';
import { ScanToPayScreen } from '@screens/ScanToPayScreen';
import { SendScreen } from '@screens/SendScreen';
import { SignInScreen } from '@screens/SignInScreen';
import { WalletSettingsScreen } from '@screens/WalletSettingsScreen';
import type { RootStackParamList } from './types';

const DEFAULT_ASSET_ID = 'usdt-arbitrum';

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  initialRouteName: keyof RootStackParamList;
};

function SignInRoute({
  navigation,
}: {
  navigation: {
    navigate: (name: 'EnableBiometric' | 'RestoreWallet') => void;
    reset: (state: { index: number; routes: Array<{ name: 'Home' }> }) => void;
  };
}) {
  const { biometryStore, walletSeedPhraseStore } = useStore();
  const { wallets } = useWalletManager();
  const hasSavedWallet = wallets.some(
    wallet => wallet.identifier === DEFAULT_WALLET_ID && wallet.exists,
  );

  async function handleOpenWallet() {
    const verified = await requireWalletBiometry(
      biometryStore,
      'Open saved wallet',
    );
    if (!verified) {
      return;
    }

    const opened = await walletSeedPhraseStore.openExistingWallet();
    if (opened) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  }

  return (
    <SignInScreen
      onContinue={() => navigation.navigate('EnableBiometric')}
      onRestore={() => navigation.navigate('RestoreWallet')}
      onOpenWallet={hasSavedWallet ? handleOpenWallet : undefined}
      openWalletError={walletSeedPhraseStore.unlockWalletRequest.error}
      openWalletLoading={walletSeedPhraseStore.unlockWalletRequest.loading}
    />
  );
}

const ObservedSignInRoute = observer(SignInRoute);

export function RootNavigator({ initialRouteName }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SignIn">
        {({ navigation }) => <ObservedSignInRoute navigation={navigation} />}
      </Stack.Screen>

      <Stack.Screen name="RestoreWallet">
        {({ navigation }) => (
          <RestoreWalletScreen
            onBack={() => navigation.goBack()}
            onRestore={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EnableBiometric">
        {({ navigation }) => (
          <EnableBiometricScreen
            onContinue={() => navigation.navigate('RecoveryPhrase')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="RecoveryPhrase">
        {({ navigation }) => (
          <RecoveryPhraseScreen
            onConfirm={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BiometricUnlock">
        {({ navigation }) => (
          <BiometricUnlockScreen
            onUnlocked={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Home">
        {({ navigation }) => (
          <HomeScreen
            onSend={() =>
              navigation.navigate('Send', { assetId: DEFAULT_ASSET_ID })
            }
            onReceive={() => navigation.navigate('Receive')}
            onScan={() => navigation.navigate('ScanToPay')}
            onRewards={() => navigation.navigate('Rewards')}
            onSelectAsset={assetId =>
              navigation.navigate('AssetDetail', { assetId })
            }
            onSettings={() => navigation.navigate('WalletSettings')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="WalletSettings">
        {({ navigation }) => (
          <WalletSettingsScreen onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>

      <Stack.Screen name="AssetDetail">
        {({ navigation, route }) => (
          <AssetDetailScreen
            assetId={route.params.assetId}
            onBack={() => navigation.goBack()}
            onSend={assetId => navigation.navigate('Send', { assetId })}
            onReceive={() => navigation.navigate('Receive')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Receive">
        {({ navigation }) => (
          <ReceiveScreen onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Send">
        {({ navigation, route }) => (
          <SendScreen
            assetId={route.params.assetId}
            onBack={() => navigation.goBack()}
            onReview={({ assetId, amount, destination, network }) =>
              navigation.navigate('ApproveTransaction', {
                assetId,
                amount,
                destination,
                network,
              })
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ApproveTransaction"
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      >
        {({ navigation, route }) => (
          <ApproveTransactionScreen
            assetId={route.params.assetId}
            amount={route.params.amount}
            destination={route.params.destination}
            network={route.params.network}
            onConfirmed={() => navigation.popToTop()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ScanToPay"
        options={{ presentation: 'fullScreenModal' }}
      >
        {({ navigation }) => (
          <ScanToPayScreen
            onClose={() => navigation.goBack()}
            onPaid={() => navigation.navigate('PaymentSuccess')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PaymentSuccess">
        {({ navigation }) => (
          <PaymentSuccessScreen
            onClaimNow={couponCode =>
              navigation.navigate('ClaimCoupon', { couponCode })
            }
            onDone={() => navigation.popToTop()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Rewards">
        {({ navigation }) => (
          <RewardsScreen
            onBack={() => navigation.goBack()}
            onClaimAll={() => navigation.navigate('ClaimCoupon', undefined)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ClaimCoupon">
        {({ navigation, route }) => (
          <ClaimCouponScreen
            couponCode={route.params?.couponCode}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
