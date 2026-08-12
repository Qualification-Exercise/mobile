import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { getNetworkLabel } from '@shared/config';
import { formatAmount } from '@shared/lib';
import { useAssetBalances } from '@shared/lib/hooks/wallet';
import { formatFiat, getFiatValue } from '@shared/store/models/asset';
import { useStore } from '@shared/store';
import {
  AppIcon,
  AssetIcon,
  HeaderBackButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  radii,
  spacing,
  typography,
} from '@shared/ui';
import { TransactionRow } from './TransactionRow';

export const AssetDetailScreen = observer(function AssetDetailScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { assetId } =
    useRoute<RouteProp<RootStackParamList, 'AssetDetail'>>().params;
  const { walletStore } = useStore();
  const asset = walletStore.assets.find(a => a.id === assetId);
  const transactions = walletStore.transactions.filter(
    t => t.assetId === assetId,
  );

  // Balances are owned by the WDK query layer, not the store's asset model —
  // reading `asset.balance` here showed a hard zero for every asset.
  const { balances } = useAssetBalances();
  const balanceBaseUnits = balances.get(assetId);

  // History lives on the backend (indexer + this device's own reports), and
  // prices are a live feed, so both are re-read whenever the screen comes into
  // focus — landing here right after a send is the common case.
  useFocusEffect(
    useCallback(() => {
      walletStore.loadTransactions();
      walletStore.loadPrices();
    }, [walletStore]),
  );

  if (!asset) {
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{asset.name}</Text>
        <AppIcon
          name="ellipsis-horizontal"
          size={22}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.summary}>
        <View style={styles.icon}>
          <AssetIcon symbol={asset.symbol} size={56} />
        </View>
        <Text style={styles.balance}>
          {balanceBaseUnits != null
            ? formatAmount(balanceBaseUnits, asset.decimals)
            : '—'}{' '}
          {asset.symbol}
        </Text>
        <Text style={styles.fiatValue}>
          {formatFiat(
            getFiatValue(
              balanceBaseUnits,
              asset.decimals,
              walletStore.priceOf(asset.symbol),
            ),
          )}
        </Text>
        <Text style={styles.networkChip}>{getNetworkLabel(asset.network)}</Text>
      </View>
      <View style={styles.actionsRow}>
        <PrimaryButton
          title="Send"
          onPress={() => navigation.navigate('Send', { assetId })}
          style={styles.actionButton}
        />
        <SecondaryButton
          title="Receive"
          onPress={() => navigation.navigate('Receive')}
          style={styles.actionButton}
        />
      </View>
      <Text style={styles.activityTitle}>Activity</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.activityContent}
        refreshControl={
          <RefreshControl
            refreshing={walletStore.transactionsRequest.loading}
            onRefresh={() => walletStore.loadTransactions()}
            tintColor={colors.textSecondary}
          />
        }
      >
        {transactions.length === 0 &&
        !walletStore.transactionsRequest.loading ? (
          <Text style={styles.empty}>No activity yet.</Text>
        ) : (
          <View style={styles.activityList}>
            {transactions.map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                divided={index < transactions.length - 1}
              />
            ))}
          </View>
        )}
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
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  summary: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing.lg,
  },
  balance: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  fiatValue: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  networkChip: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  actionButton: {
    flex: 1,
  },
  empty: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xxxl,
  },
  activityTitle: {
    ...typography.overline,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  activityContent: {
    paddingBottom: spacing.xxl,
  },
  activityList: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
});
