import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NetworkName } from '../../../.wdk';
import { getNetworkLabel, groupAssetsByNetwork } from '@shared/config';
import { AppIcon } from './AppIcon';
import { colors, radii, spacing, typography } from './tokens';

// The minimum an entry needs to be listed. Both the registry config and the
// store's asset model satisfy it, so neither screen has to convert.
export type PickableAsset = {
  id: string;
  symbol: string;
  name: string;
  network: NetworkName;
};

type AssetPickerSheetProps = {
  visible: boolean;
  title: string;
  assets: PickableAsset[];
  selectedAssetId: string;
  onSelect: (assetId: string) => void;
  onClose: () => void;
};

// Pick an asset from the full registry, grouped by network. Choosing the asset
// is what chooses the chain — an asset only exists on one of them.
export function AssetPickerSheet({
  visible,
  title,
  assets,
  selectedAssetId,
  onSelect,
  onClose,
}: AssetPickerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* The sheet swallows taps so only the backdrop dismisses. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {groupAssetsByNetwork(assets).map(group => (
              <View key={group.network}>
                <Text style={styles.network}>
                  {getNetworkLabel(group.network)}
                </Text>
                {group.assets.map(asset => {
                  const selected = asset.id === selectedAssetId;
                  return (
                    <TouchableOpacity
                      key={asset.id}
                      style={[styles.row, selected && styles.rowSelected]}
                      onPress={() => onSelect(asset.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.symbol}>{asset.symbol}</Text>
                        <Text style={styles.name}>{asset.name}</Text>
                      </View>
                      {selected ? (
                        <AppIcon
                          name="checkmark"
                          size={18}
                          color={colors.accentBright}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,9,13,0.66)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  network: {
    ...typography.overline,
    color: colors.textTertiary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  rowSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  rowText: {
    flex: 1,
  },
  symbol: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  name: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
