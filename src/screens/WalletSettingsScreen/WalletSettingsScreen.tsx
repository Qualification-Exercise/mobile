import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { WalletSettings } from '@features/wallet-settings';
import { HeaderBackButton, ScreenContainer, colors, spacing } from '@shared/ui';

export function WalletSettingsScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
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
