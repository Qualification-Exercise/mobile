import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import { ScreenContainer, colors, radii, spacing } from '@shared/ui';
import { AssetRow } from '@widgets/asset-row';

const DEFAULT_ASSET_ID = 'usdt-arbitrum';

type QuickActionProps = {
  label: string;
  glyph: string;
  onPress: () => void;
  highlighted?: boolean;
};

function QuickAction({ label, glyph, onPress, highlighted }: QuickActionProps) {
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
        <Text
          style={[
            styles.quickActionGlyph,
            highlighted && styles.quickActionGlyphHighlighted,
          ]}
        >
          {glyph}
        </Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export const HomeScreen = observer(function HomeScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();
  const [wholePart, decimalPart] = walletStore.totalFiatBalance
    .toFixed(2)
    .split('.');

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>MJ</Text>
          </View>
          <View>
            <Text style={styles.walletName}>
              {walletStore.wallet.displayName}
            </Text>
            <Text style={styles.walletAddress}>
              {walletStore.wallet.address}
            </Text>
          </View>
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>
            ${wholePart}
            <Text style={styles.balanceDecimal}>.{decimalPart}</Text>
          </Text>
          <View style={styles.deltaBadge}>
            <Text style={styles.deltaLabel}>▲ 2.4% today</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <QuickAction
            label="Send"
            glyph="↑"
            onPress={() =>
              navigation.navigate('Send', { assetId: DEFAULT_ASSET_ID })
            }
            highlighted
          />
          <QuickAction
            label="Receive"
            glyph="↓"
            onPress={() => navigation.navigate('Receive')}
          />
          <QuickAction
            label="Scan"
            glyph="⛶"
            onPress={() => navigation.navigate('ScanToPay')}
          />
          <QuickAction
            label="Rewards"
            glyph="◆"
            onPress={() => navigation.navigate('Rewards')}
          />
        </View>

        <View style={styles.assetsHeader}>
          <Text style={styles.assetsTitle}>Assets</Text>
          <Text style={styles.assetsCount}>{walletStore.assets.length}</Text>
        </View>
        <View style={styles.assetsList}>
          {walletStore.assets.map(asset => (
            <AssetRow
              key={asset.id}
              asset={asset}
              onPress={() =>
                navigation.navigate('AssetDetail', { assetId: asset.id })
              }
            />
          ))}
        </View>
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
  balanceDecimal: {
    color: colors.textTertiary,
  },
  deltaBadge: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(45,190,140,0.12)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  deltaLabel: {
    color: colors.positive,
    fontSize: 12,
    fontWeight: '600',
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
  quickActionGlyph: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickActionGlyphHighlighted: {
    color: colors.background,
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
  assetsList: {
    gap: spacing.xs,
  },
});
