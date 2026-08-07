import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ApproveTransactionScreen,
  AssetDetailScreen,
  BiometricUnlockScreen,
  ClaimCouponScreen,
  CreateWalletScreen,
  DevMenuScreen,
  EnableBiometricScreen,
  HomeScreen,
  PaymentSuccessScreen,
  ReceiveScreen,
  RestoreWalletScreen,
  RewardsScreen,
  ScanToPayScreen,
  SendScreen,
  SignInScreen,
  WalletSettingsScreen,
  WalletSetupScreen,
} from '@screens';
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
      <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
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
      {__DEV__ ? (
        <Stack.Screen
          name="DevMenu"
          component={DevMenuScreen}
          options={{ presentation: 'modal' }}
        />
      ) : null}
    </Stack.Navigator>
  );
}
