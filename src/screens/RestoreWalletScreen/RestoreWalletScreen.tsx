import { StyleSheet, Text, View } from 'react-native';
import { RestoreWallet } from '@features/restore-wallet';
import { HeaderBackButton, ScreenContainer, colors, spacing } from '@shared/ui';

type RestoreWalletScreenProps = {
  onBack: () => void;
  onRestore: () => void;
};

export function RestoreWalletScreen({
  onBack,
  onRestore,
}: RestoreWalletScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>Restore wallet</Text>
        <View style={styles.headerSpacer} />
      </View>
      <RestoreWallet onRestore={onRestore} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
});
