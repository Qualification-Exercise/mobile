import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { ApproveTransaction } from '@features/approve-transaction';
import { useStore } from '@shared/store';

type ApproveTransactionScreenProps = {
  assetId: string;
  amount: number;
  destination: string;
  network: string;
  onConfirmed: () => void;
};

export const ApproveTransactionScreen = observer(
  function ApproveTransactionScreenView({
    assetId,
    amount,
    destination,
    network,
    onConfirmed,
  }: ApproveTransactionScreenProps) {
    const { walletStore } = useStore();
    const asset = walletStore.assets.find(a => a.id === assetId);

    if (!asset) {
      return null;
    }

    return (
      <View style={styles.backdrop}>
        <ApproveTransaction
          assetId={assetId}
          assetSymbol={asset.symbol}
          amount={amount}
          destination={destination}
          network={network}
          onConfirmed={onConfirmed}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,7,0.55)',
    justifyContent: 'flex-end',
  },
});
