import { StyleSheet, View } from 'react-native';
import { ApproveTransaction } from '@features/approve-transaction';

type ApproveTransactionScreenProps = {
  assetId: string;
  assetSymbol: string;
  amount: number;
  destination: string;
  network: string;
  onConfirmed: () => void;
};

export function ApproveTransactionScreen({
  assetId,
  assetSymbol,
  amount,
  destination,
  network,
  onConfirmed,
}: ApproveTransactionScreenProps) {
  return (
    <View style={styles.backdrop}>
      <ApproveTransaction
        assetId={assetId}
        assetSymbol={assetSymbol}
        amount={amount}
        destination={destination}
        network={network}
        onConfirmed={onConfirmed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,7,0.55)',
    justifyContent: 'flex-end',
  },
});
