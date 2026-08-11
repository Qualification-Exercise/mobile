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
import {
  formatFiat,
  getAssetColor,
  getAssetGlyphColor,
  getAssetIcon,
  getFiatValue,
} from '@shared/store/models/asset';
import { useStore } from '@shared/store';
import {
  AppIcon,
  HeaderBackButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  spacing,
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
        <View style={[styles.icon, { backgroundColor: getAssetColor(asset) }]}>
          <Text
            style={[styles.iconGlyph, { color: getAssetGlyphColor(asset) }]}
          >
            {getAssetIcon(asset)}
          </Text>
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
          )}{' '}
          · {getNetworkLabel(asset.network)}
        </Text>
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
        ) : null}
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
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
  empty: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C4CCD4',
    marginBottom: spacing.sm,
  },
});
