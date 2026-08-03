import { StyleSheet, Text, View } from 'react-native';
import { WalletSettings } from '@features/wallet-settings';
import { HeaderBackButton, ScreenContainer, colors, spacing } from '@shared/ui';

type WalletSettingsScreenProps = {
  onBack: () => void;
};

export function WalletSettingsScreen({ onBack }: WalletSettingsScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>Wallet settings</Text>
        <View style={styles.headerSpacer} />
      </View>
      <WalletSettings />
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
