import { type RouteProp, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '@app/navigation/types';
import { ApproveTransaction } from '@features/approve-transaction';
import { useStore } from '@shared/store';

export const ApproveTransactionScreen = observer(
  function ApproveTransactionScreenView() {
    const { assetId, amount, destination, network } =
      useRoute<RouteProp<RootStackParamList, 'ApproveTransaction'>>().params;
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
