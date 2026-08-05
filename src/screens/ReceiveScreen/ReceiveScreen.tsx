import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import {
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  AppIcon,
  HeaderBackButton,
  PrimaryButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { QrPlaceholder } from '@widgets/qr-placeholder';

const DEFAULT_ASSET_ID = 'usdt-arbitrum';

export const ReceiveScreen = observer(function ReceiveScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();
  const asset =
    walletStore.assets.find(a => a.id === DEFAULT_ASSET_ID) ??
    walletStore.assets[0];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Receive</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <View style={styles.selector}>
          <View style={styles.selectorPill}>
            <Text style={styles.selectorPillLabel}>{asset.symbol}</Text>
          </View>
          <View style={styles.selectorNetwork}>
            <Text style={styles.selectorNetworkLabel}>{asset.network}</Text>
            <AppIcon
              name="chevron-down"
              size={14}
              color={colors.textSecondary}
            />
          </View>
        </View>
        <QrPlaceholder size={236} />
        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>Your {asset.network} address</Text>
          <Text style={styles.addressValue}>{walletStore.wallet.address}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => Clipboard.setString(walletStore.wallet.address)}
        >
          <AppIcon name="copy-outline" size={18} color={colors.accentBright} />
          <Text style={styles.copyLabel}>Copy</Text>
        </TouchableOpacity>
        <PrimaryButton
          title="Share"
          onPress={() => {}}
          style={styles.actionButton}
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
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 5,
  },
  selectorPill: {
    backgroundColor: colors.accent,
    borderRadius: radii.xs - 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  selectorPillLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.background,
  },
  selectorNetwork: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
  },
  selectorNetworkLabel: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  addressBlock: {
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  addressValue: {
    fontFamily: 'Menlo',
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
  },
  copyLabel: {
    color: colors.accentBright,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
  },
});
