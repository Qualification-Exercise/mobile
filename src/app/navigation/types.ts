import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SignIn: undefined;
  EnableBiometric: undefined;
  WalletSetup: undefined;
  BiometricUnlock: undefined;
  RestoreWallet: undefined;
  CreateWallet: undefined;
  Home: undefined;
  AssetDetail: { assetId: string };
  Receive: undefined;
  Send: { assetId: string };
  ApproveTransaction: {
    assetId: string;
    amount: number;
    destination: string;
    network: string;
  };
  ScanToPay: undefined;
  PaymentSuccess: undefined;
  Rewards: undefined;
  ClaimCoupon: { couponCode?: string } | undefined;
  WalletSettings: undefined;
};

// Native-stack navigation prop typed with the app's param list. Pass to
// `useNavigation<RootStackNavigationProp>()` for typed navigation actions.
export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
