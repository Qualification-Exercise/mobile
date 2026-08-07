import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  ScreenContainer,
  HeaderBackButton,
  PrimaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { AmountEntry } from './AmountEntry';

export const SendScreen = observer(function SendScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { assetId } = useRoute<RouteProp<RootStackParamList, 'Send'>>().params;
  const { walletStore } = useStore();
  const asset = walletStore.assets.find(a => a.id === assetId);

  const [amount, setAmount] = useState(0);
  const [destination, setDestination] = useState('');

  if (!asset) {
    return null;
  }

  function handleQuickFill(fraction: number) {
    setAmount(Number((asset!.balance * fraction).toFixed(2)));
  }

  const canReview = amount > 0 && destination.trim().length > 0;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Send {asset.symbol}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <AmountEntry
          amount={amount.toFixed(2)}
          helperText={`≈ $${amount.toFixed(
            2,
          )} · Balance ${asset.balance.toLocaleString()}`}
          onQuickFill={handleQuickFill}
        />
        <Text style={styles.label}>To</Text>
        <View style={styles.destinationRow}>
          <TextInput
            style={styles.destinationInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination address"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Network</Text>
          <Text style={styles.detailValue}>{asset.network}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Network fee</Text>
          <Text style={styles.detailValue}>≈ $0.02</Text>
        </View>
        <View style={styles.spacer} />
        <PrimaryButton
          title="Review send"
          onPress={() =>
            navigation.navigate('ApproveTransaction', {
              assetId,
              amount,
              destination,
              network: asset.network,
            })
          }
          disabled={!canReview}
        />
      </View>
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
  container: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
  },
  destinationInput: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  detailLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  spacer: {
    flex: 1,
  },
});
