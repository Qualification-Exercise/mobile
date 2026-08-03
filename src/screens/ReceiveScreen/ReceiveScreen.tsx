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
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <View style={styles.selector}>
          <View style={styles.selectorPill}>
            <Text style={styles.selectorPillLabel}>{asset.symbol}</Text>
          </View>
          <Text style={styles.selectorNetwork}>{asset.network} ▾</Text>
        </View>
        <QrPlaceholder size={236} />
        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>Your {asset.network} address</Text>
          <Text style={styles.addressValue}>{walletStore.wallet.address}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <SecondaryButton
          title="⧉ Copy"
          onPress={() => Clipboard.setString(walletStore.wallet.address)}
          style={styles.actionButton}
        />
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
  back: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 22,
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
    fontSize: 12.5,
    color: colors.textSecondary,
    paddingHorizontal: 14,
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
  actionButton: {
    flex: 1,
  },
});
