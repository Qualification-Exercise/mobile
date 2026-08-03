import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { RestoreWallet } from '@features/restore-wallet';
import { HeaderBackButton, ScreenContainer, colors, spacing } from '@shared/ui';

export function RestoreWalletScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Restore wallet</Text>
        <View style={styles.headerSpacer} />
      </View>
      <RestoreWallet
        onRestore={() =>
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
        }
      />
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
