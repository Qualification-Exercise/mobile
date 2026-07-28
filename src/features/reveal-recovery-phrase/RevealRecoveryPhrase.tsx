import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '@shared/store';
import { PrimaryButton, colors, radii, spacing } from '@shared/ui';
import { SeedWordGrid } from '@widgets/seed-word-grid';

type RevealRecoveryPhraseProps = {
  onConfirm: () => void;
};

const BACKUP_STATUSES = [
  { label: 'Device', status: 'Encrypted ✓' },
  { label: 'iCloud', status: 'Backed up ✓' },
  { label: 'Backend', status: 'Synced ✓' },
];

export const RevealRecoveryPhrase = observer(function RevealRecoveryPhraseView({
  onConfirm,
}: RevealRecoveryPhraseProps) {
  const { walletStore } = useStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your recovery phrase</Text>
      <Text style={styles.description}>
        Write these 12 words down in order. This is the only way to recover your
        wallet.
      </Text>
      <View style={styles.gridWrapper}>
        <SeedWordGrid words={walletStore.seedPhrase} />
      </View>
      <View style={styles.warning}>
        <Text style={styles.warningText}>
          Never share your phrase. WDK cannot recover it for you.
        </Text>
      </View>
      <View style={styles.spacer} />
      <View style={styles.statusRow}>
        {BACKUP_STATUSES.map(({ label, status }) => (
          <View key={label} style={styles.statusCard}>
            <Text style={styles.statusLabel}>{label}</Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>
        ))}
      </View>
      <PrimaryButton title="I've saved it — Continue" onPress={onConfirm} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  gridWrapper: {
    marginTop: spacing.xl,
  },
  warning: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(45,190,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45,190,140,0.2)',
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  warningText: {
    color: colors.positive,
    fontSize: 12.5,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 11,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusValue: {
    fontSize: 10,
    color: colors.accentBright,
  },
});
