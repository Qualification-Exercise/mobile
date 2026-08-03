import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { WalletSetupScreen } from '@screens/WalletSetupScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  initialRouteName: keyof RootStackParamList;
};

export function RootNavigator({ initialRouteName }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="EnableBiometric" component={EnableBiometricScreen} />
      <Stack.Screen name="WalletSetup" component={WalletSetupScreen} />
      <Stack.Screen name="BiometricUnlock" component={BiometricUnlockScreen} />
      <Stack.Screen name="RestoreWallet" component={RestoreWalletScreen} />
      <Stack.Screen name="RecoveryPhrase" component={RecoveryPhraseScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WalletSettings" component={WalletSettingsScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <Stack.Screen name="Receive" component={ReceiveScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
      <Stack.Screen
        name="ApproveTransaction"
        component={ApproveTransactionScreen}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
      <Stack.Screen
        name="ScanToPay"
        component={ScanToPayScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
      <Stack.Screen name="ClaimCoupon" component={ClaimCouponScreen} />
    </Stack.Navigator>
  );
}
