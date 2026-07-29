import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AssetDetailScreen } from '@screens/AssetDetailScreen';
import { ApproveTransactionScreen } from '@screens/ApproveTransactionScreen';
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
import type { RootStackParamList } from './types';

const DEFAULT_ASSET_ID = 'usdt-arbitrum';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SignIn">
        {({ navigation }) => (
          <SignInScreen
            onContinue={() => navigation.navigate('EnableBiometric')}
            onRestore={() => navigation.navigate('RestoreWallet')}
          />
        )}
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
          />
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
