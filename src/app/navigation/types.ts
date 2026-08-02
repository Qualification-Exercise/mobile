export type RootStackParamList = {
  SignIn: undefined;
  RestoreWallet: undefined;
  EnableBiometric: undefined;
  BiometricUnlock: undefined;
  RecoveryPhrase: undefined;
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
  ClaimCoupon: { couponCode?: string };
};
