import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SignIn: undefined;
  EnableBiometric: undefined;
  WalletSetup: undefined;
  BiometricUnlock: undefined;
  RestoreWallet: undefined;
  CreateWallet: { discardExistingWallet?: boolean } | undefined;
  Home: undefined;
  AssetDetail: { assetId: string };
  Receive: { assetId?: string } | undefined;
  Send: { assetId: string; destination?: string };
  ApproveTransaction: {
    assetId: string;
    amountBaseUnits: string;
    destination: string;
    gasMode?: 'native' | 'token';
  };
  ScanToPay: undefined;
  PaymentSuccess: {
    assetSymbol: string;
    amount: string;
    hash?: string;
    status?: 'pending' | 'confirmed' | 'failed';
  };
  Rewards: undefined;
  ClaimCoupon: { couponCode?: string } | undefined;
  WalletSettings: undefined;
  DevMenu: undefined;
};

// Native-stack navigation prop typed with the app's param list. Pass to
// `useNavigation<RootStackNavigationProp>()` for typed navigation actions.
export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
