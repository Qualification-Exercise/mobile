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
    amountBaseUnits: string;
    destination: string;
  };
  ScanToPay: undefined;
  // With params: a plain send-success (from the Send/Approve flow). Without:
  // the scan-to-pay coupon-cashback success, which reads the latest store data.
  PaymentSuccess:
    | {
        assetSymbol: string;
        amount: string;
        hash?: string;
        status?: 'pending' | 'confirmed' | 'failed';
      }
    | undefined;
  Rewards: undefined;
  ClaimCoupon: { couponCode?: string } | undefined;
  WalletSettings: undefined;
  DevMenu: undefined;
};

// Native-stack navigation prop typed with the app's param list. Pass to
// `useNavigation<RootStackNavigationProp>()` for typed navigation actions.
export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
