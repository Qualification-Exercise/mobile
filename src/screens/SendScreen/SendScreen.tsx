import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { SendAsset } from '@features/send-asset';
import { useStore } from '@shared/store';
import { ScreenContainer, HeaderBackButton, colors, spacing } from '@shared/ui';

export const SendScreen = observer(function SendScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { assetId } = useRoute<RouteProp<RootStackParamList, 'Send'>>().params;
  const { walletStore } = useStore();
  const asset = walletStore.assets.find(a => a.id === assetId);

  if (!asset) {
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Send {asset.symbol}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <SendAsset
        asset={asset}
        onReview={({ amount, destination }) =>
          navigation.navigate('ApproveTransaction', {
            assetId,
            amount,
            destination,
            network: asset.network,
          })
        }
      />
    </ScreenContainer>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
});
