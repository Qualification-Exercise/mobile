import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  Clipboard,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { getNetworkLabel } from '@shared/config';
import { buildPaymentUri } from '@shared/lib';
import { useReceiveAddress } from '@shared/lib/hooks/wallet';
import { useStore } from '@shared/store';
import {
  AppIcon,
  HeaderBackButton,
  PrimaryButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
  AssetPickerSheet,
  QrCode,
} from '@shared/ui';

const DEFAULT_ASSET_ID = 'usdt-arbitrum';

export const ReceiveScreen = observer(function ReceiveScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();
  const assets = walletStore.assets;

  const [selectedAssetId, setSelectedAssetId] = useState(DEFAULT_ASSET_ID);
  const [pickerOpen, setPickerOpen] = useState(false);
  const asset = assets.find(a => a.id === selectedAssetId) ?? assets[0];

  // Derive the receive address for the selected asset's chain. Switching the
  // asset re-runs the hook for the new network.
  const { address, isLoading } = useReceiveAddress(asset.network);
  const displayAddress =
    address ?? (isLoading ? 'Loading address…' : 'Address unavailable');

  // What the QR encodes: a payment URI another wallet can act on, which for a
  // token also names the contract so the payer cannot pick the wrong asset.
  const paymentUri = address ? buildPaymentUri(asset.id, address) : null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Receive</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.selectorPill}>
            <Text style={styles.selectorPillLabel}>{asset.symbol}</Text>
          </View>
          <View style={styles.selectorNetwork}>
            <Text style={styles.selectorNetworkLabel}>
              {getNetworkLabel(asset.network)}
            </Text>
            <AppIcon
              name="chevron-down"
              size={14}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
        {paymentUri ? (
          <QrCode value={paymentUri} size={236} />
        ) : (
          <View style={styles.qrFallback} />
        )}
        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>
            Your {getNetworkLabel(asset.network)} address
          </Text>
          <Text style={styles.addressValue}>{displayAddress}</Text>
        </View>
      </View>
      <AssetPickerSheet
        visible={pickerOpen}
        title="Receive on"
        assets={assets}
        selectedAssetId={asset.id}
        onSelect={id => {
          setSelectedAssetId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.copyButton, !address && styles.copyButtonDisabled]}
          onPress={() => address && Clipboard.setString(address)}
          disabled={!address}
        >
          <AppIcon name="copy-outline" size={18} color={colors.accentBright} />
          <Text style={styles.copyLabel}>Copy</Text>
        </TouchableOpacity>
        <PrimaryButton
          title="Share"
          onPress={() => {
            if (paymentUri) {
              // Sharing can be dismissed by the user; nothing to recover from.
              Share.share({ message: paymentUri }).catch(() => {});
            }
          }}
          disabled={!paymentUri}
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
  qrFallback: {
    width: 236,
    height: 236,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceAlt,
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
    textAlign: 'center',
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
  copyButtonDisabled: {
    opacity: 0.5,
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
