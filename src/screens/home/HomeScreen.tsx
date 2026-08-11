import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useRefreshBalance, useWdkApp } from '@tetherto/wdk-react-native-core';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { getNetworkLabel, groupAssetsByNetwork } from '@shared/config';
import {
  useAssetBalances,
  useReceiveAddress,
  useWallet,
} from '@shared/lib/hooks/wallet';
import { formatFiat, getFiatValue } from '@shared/store/models/asset';
import { shortenAddress } from '@shared/store/models/transaction';
import { useStore } from '@shared/store';
import { AppIcon, ScreenContainer, colors, radii, spacing } from '@shared/ui';
import { AssetRow } from './AssetRow';

const DEFAULT_ASSET_ID = 'usdt-arbitrum';

// Focus fires on every return to this screen (screens stay mounted, so React
// Query never refetches on its own). Forcing a full-wallet refresh each time
// hammered keyless TronGrid into 429s, so a focus refresh is skipped when the
// last one was under this window ago. Pull-to-refresh always forces one.
const FOCUS_REFRESH_MIN_INTERVAL_MS = 30_000;

// The address shown in the header. EVM networks share one derived account, so
// the primary payment chain stands in for "your address".
const HEADER_ADDRESS_NETWORK = 'arbitrum';

type IconName = Parameters<typeof AppIcon>[0]['name'];

type QuickActionProps = {
  label: string;
  iconName: IconName;
  onPress: () => void;
  highlighted?: boolean;
};

function QuickAction({
  label,
  iconName,
  onPress,
  highlighted,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.quickActionIcon,
          highlighted && styles.quickActionIconHighlighted,
        ]}
      >
        <AppIcon
          name={iconName}
          size={22}
          color={highlighted ? colors.background : colors.textPrimary}
        />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export const HomeScreen = observer(function HomeScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { state } = useWdkApp();
  const { hasPersistedWallet } = useWallet();
  const { walletStore } = useStore();
  const { balances } = useAssetBalances();
  const { address } = useReceiveAddress(HEADER_ADDRESS_NETWORK);
  // `useMutation` hands back a fresh object every render, so it is read
  // through a ref: putting it in the callback's dependencies would rebuild
  // `refresh` on each render, and `useFocusEffect` would re-run it forever.
  const refreshBalance = useRefreshBalance();
  const refreshBalanceRef = useRef(refreshBalance);
  refreshBalanceRef.current = refreshBalance;

  // A send changes the balance only once it is mined, which is usually after
  // the user has already navigated back here — so balances and prices are
  // re-read on focus, not just on mount.
  const lastRefreshRef = useRef(0);
  const refresh = useCallback(() => {
    lastRefreshRef.current = Date.now();
    refreshBalanceRef.current.mutate(
      { accountIndex: 0, type: 'wallet' },
      { onError: () => {} },
    );
    return walletStore.loadPrices();
  }, [walletStore]);

  // Skip the focus refresh when a recent one already ran — rapid navigation
  // between Home and a detail screen would otherwise refetch every balance each
  // time. A stale enough focus, and pull-to-refresh below, still refresh.
  useFocusEffect(
    useCallback(() => {
      if (
        Date.now() - lastRefreshRef.current >=
        FOCUS_REFRESH_MIN_INTERVAL_MS
      ) {
        refresh();
      }
    }, [refresh]),
  );

  // The pull-to-refresh spinner must track only the user's own gesture. Tying
  // it to `pricesRequest.loading` would show it on every focus-driven refresh
  // too — and a programmatic `refreshing={true}` (no pull) leaves the spinner
  // stuck at the top of the list when returning to this screen.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  }, [refresh]);
  const hasWallet = hasPersistedWallet() || state.status === 'READY';

  // Every asset the feed prices, summed. Assets with no market (UTL) and
  // balances that have not loaded are left out rather than counted as zero.
  const totalFiat = walletStore.assets.reduce<number | null>((total, asset) => {
    const value = getFiatValue(
      balances.get(asset.id),
      asset.decimals,
      walletStore.priceOf(asset.symbol),
    );
    if (value == null) {
      return total;
    }
    return (total ?? 0) + value;
  }, null);

  useEffect(() => {
    if (!hasWallet) {
      navigation.reset({ index: 0, routes: [{ name: 'WalletSetup' }] });
    }
  }, [hasWallet, navigation]);

  if (!hasWallet) {
    return null;
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        <TouchableOpacity
          style={styles.header}
          onPress={() => navigation.navigate('WalletSettings')}
          activeOpacity={0.85}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>MJ</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.walletName}>
              {walletStore.wallet.displayName}
            </Text>
            <Text style={styles.walletAddress}>
              {address ? shortenAddress(address) : 'Deriving address…'}
            </Text>
          </View>
          <AppIcon
            name="settings-outline"
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>{formatFiat(totalFiat)}</Text>
        </View>

        <View style={styles.actionsRow}>
          <QuickAction
            label="Send"
            iconName="arrow-up"
            onPress={() =>
              navigation.navigate('Send', { assetId: DEFAULT_ASSET_ID })
            }
            highlighted
          />
          <QuickAction
            label="Receive"
            iconName="arrow-down"
            onPress={() => navigation.navigate('Receive')}
          />
          <QuickAction
            label="Scan"
            iconName="qr-code-outline"
            onPress={() => navigation.navigate('ScanToPay')}
          />
          <QuickAction
            label="Rewards"
            iconName="gift-outline"
            onPress={() => navigation.navigate('Rewards')}
          />
        </View>

        <View style={styles.assetsHeader}>
          <Text style={styles.assetsTitle}>Assets</Text>
          <Text style={styles.assetsCount}>{walletStore.assets.length}</Text>
        </View>
        {groupAssetsByNetwork(walletStore.assets).map(group => (
          <View key={group.network} style={styles.networkGroup}>
            <Text style={styles.networkTitle}>
              {getNetworkLabel(group.network)}
            </Text>
            <View style={styles.assetsList}>
              {group.assets.map(asset => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  balanceBaseUnits={balances.get(asset.id)}
                  price={walletStore.priceOf(asset.symbol)}
                  onPress={() =>
                    navigation.navigate('AssetDetail', { assetId: asset.id })
                  }
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.xs,
    backgroundColor: '#22285A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  walletName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  walletAddress: {
    fontFamily: 'Menlo',
    fontSize: 11,
    color: colors.textSecondary,
  },
  balanceBlock: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconHighlighted: {
    backgroundColor: colors.accent,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#C4CCD4',
  },
  assetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  assetsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  assetsCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  networkGroup: {
    marginTop: spacing.md,
  },
  networkTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  assetsList: {
    gap: spacing.xs,
  },
});
