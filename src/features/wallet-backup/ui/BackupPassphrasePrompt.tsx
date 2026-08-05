import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '@shared/ui';

type BackupPassphrasePromptProps = {
  passphrase: string;
  confirmPassphrase: string;
  onPassphraseChange: (value: string) => void;
  onConfirmPassphraseChange: (value: string) => void;
  error?: string;
  showHeader?: boolean;
};

export function BackupPassphrasePrompt({
  passphrase,
  confirmPassphrase,
  onPassphraseChange,
  onConfirmPassphraseChange,
  error,
  showHeader = true,
}: BackupPassphrasePromptProps) {
  return (
    <View style={styles.container}>
      {showHeader ? (
        <>
          <Text style={styles.title}>Backend backup passphrase</Text>
          <Text style={styles.description}>
            This passphrase encrypts your backup on the server. It is separate
            from Face ID and cannot be recovered if lost.
          </Text>
        </>
      ) : null}
      <TextInput
        style={styles.input}
        value={passphrase}
        onChangeText={onPassphraseChange}
        placeholder="Enter passphrase"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        value={confirmPassphrase}
        onChangeText={onConfirmPassphraseChange}
        placeholder="Confirm passphrase"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  error: {
    color: '#E0715A',
    fontSize: 12,
  },
});
