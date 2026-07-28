import { observer } from 'mobx-react-lite';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAssetColor,
  getAssetGlyphColor,
  getAssetIcon,
} from '@entities/asset';
import { useStore } from '@shared/store';
import {
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  spacing,
} from '@shared/ui';
import { TransactionRow } from '@widgets/transaction-row';

type AssetDetailScreenProps = {
  assetId: string;
  onBack: () => void;
  onSend: (assetId: string) => void;
  onReceive: (assetId: string) => void;
};

export const AssetDetailScreen = observer(function AssetDetailScreenView({
  assetId,
  onBack,
  onSend,
  onReceive,
}: AssetDetailScreenProps) {
  const { walletStore } = useStore();
  const asset = walletStore.assets.find(a => a.id === assetId);
  const transactions = walletStore.transactions.filter(
    t => t.assetId === assetId,
  );

  if (!asset) {
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{asset.name}</Text>
        <Text style={styles.headerMenu}>⋯</Text>
      </View>
      <View style={styles.summary}>
        <View style={[styles.icon, { backgroundColor: getAssetColor(asset) }]}>
          <Text
            style={[styles.iconGlyph, { color: getAssetGlyphColor(asset) }]}
          >
            {getAssetIcon(asset)}
          </Text>
        </View>
        <Text style={styles.balance}>{asset.balance.toLocaleString()}</Text>
        <Text style={styles.fiatValue}>
          ≈ ${asset.fiatValue.toFixed(2)} · {asset.network}
        </Text>
      </View>
      <View style={styles.actionsRow}>
        <PrimaryButton
          title="↑ Send"
          onPress={() => onSend(assetId)}
          style={styles.actionButton}
        />
        <SecondaryButton
          title="↓ Receive"
          onPress={() => onReceive(assetId)}
          style={styles.actionButton}
        />
      </View>
      <Text style={styles.activityTitle}>Activity</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {transactions.map(transaction => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  back: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerMenu: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  summary: {
    alignItems: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconGlyph: {
    fontSize: 26,
    fontWeight: '700',
  },
  balance: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fiatValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  actionButton: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C4CCD4',
    marginBottom: spacing.sm,
  },
});
