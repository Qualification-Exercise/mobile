import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, colors, radii, spacing } from '@shared/ui';
import type { BackupOptionState, BackupProviderKind } from '../types';

type BackupOptionTogglesProps = {
  device: BackupOptionState;
  icloud: BackupOptionState;
  backend: BackupOptionState;
  backendEnabled: boolean;
  backendPassphraseReady: boolean;
  onBackendEnabledChange: (enabled: boolean) => void;
  onBackendConfigure: () => void;
};

const STATUS_LABEL: Record<BackupOptionState['status'], string> = {
  idle: 'Pending',
  pending: 'Pending',
  in_progress: 'Syncing…',
  completed: 'Ready',
  failed: 'Failed',
};

function statusLabelFor(
  kind: BackupProviderKind,
  state: BackupOptionState,
): string {
  if (kind === 'device' && state.status === 'completed') {
    return 'Encrypted';
  }
  if (kind === 'backend' && state.status === 'completed') {
    return 'Synced';
  }
  if (kind === 'icloud' && state.status === 'idle') {
    return 'Soon';
  }
  return STATUS_LABEL[state.status];
}

function StatusBadge({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: 'default' | 'success' | 'warning' | 'muted' | 'error';
  icon?: 'checkmark-circle' | 'alert-circle' | 'time-outline';
}) {
  const toneStyles = {
    default: styles.badgeDefault,
    success: styles.badgeSuccess,
    muted: styles.badgeMuted,
    warning: styles.badgeWarning,
    error: styles.badgeError,
  }[tone];

  const toneTextStyles = {
    default: styles.badgeTextDefault,
    success: styles.badgeTextSuccess,
    muted: styles.badgeTextMuted,
    warning: styles.badgeTextWarning,
    error: styles.badgeTextError,
  }[tone];

  const iconColor = {
    default: colors.accentBright,
    success: colors.positive,
    muted: colors.textTertiary,
    warning: '#E8B45A',
    error: '#E0715A',
  }[tone];

  return (
    <View style={[styles.badge, toneStyles]}>
      {icon ? <AppIcon name={icon} size={12} color={iconColor} /> : null}
      <Text style={[styles.badgeText, toneTextStyles]}>{label}</Text>
    </View>
  );
}

function BackupToggle({
  enabled,
  disabled,
  onPress,
}: {
  enabled: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.toggleTrack,
        enabled && styles.toggleTrackOn,
        disabled && styles.toggleTrackDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled: !!disabled }}
    >
      <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
    </Pressable>
  );
}

function BackupOptionRow({
  icon,
  title,
  subtitle,
  badge,
  trailing,
  onPress,
  disabled,
  highlighted,
}: {
  icon: 'phone-portrait-outline' | 'cloud-outline' | 'server-outline';
  title: string;
  subtitle: string;
  badge: ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  const content = (
    <>
      <View style={styles.rowIconWrap}>
        <AppIcon
          name={icon}
          size={18}
          color={disabled ? colors.textTertiary : colors.accentBright}
        />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}>
            {title}
          </Text>
          {badge}
        </View>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[
          styles.row,
          highlighted && styles.rowHighlighted,
          disabled && styles.rowDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        highlighted && styles.rowHighlighted,
        disabled && styles.rowDisabled,
      ]}
    >
      {content}
    </View>
  );
}

export function BackupOptionToggles({
  device,
  // TODO: remove this once we have a working iCloud backup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  icloud,
  backend,
  backendEnabled,
  backendPassphraseReady,
  onBackendEnabledChange,
  onBackendConfigure,
}: BackupOptionTogglesProps) {
  function backendBadge() {
    if (backend.status === 'failed') {
      return <StatusBadge label="Failed" tone="error" icon="alert-circle" />;
    }
    if (backend.status === 'in_progress') {
      return (
        <StatusBadge label="Syncing…" tone="warning" icon="time-outline" />
      );
    }
    if (backend.status === 'completed') {
      return (
        <StatusBadge label="Synced" tone="success" icon="checkmark-circle" />
      );
    }
    if (backendEnabled && backendPassphraseReady) {
      return (
        <StatusBadge label="Ready" tone="success" icon="checkmark-circle" />
      );
    }
    if (backendEnabled) {
      return (
        <StatusBadge
          label="Needs passphrase"
          tone="warning"
          icon="alert-circle"
        />
      );
    }
    return <StatusBadge label="Optional" tone="muted" />;
  }

  function backendSubtitle() {
    if (!backendEnabled) {
      return 'Encrypt a copy on the server with your passphrase';
    }
    if (!backendPassphraseReady) {
      return 'Tap to set the passphrase used for encryption';
    }
    return 'Passphrase saved · tap to change';
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Backup options</Text>
      <View style={styles.list}>
        <BackupOptionRow
          icon="phone-portrait-outline"
          title="This device"
          subtitle="Always encrypted in your phone's secure storage"
          badge={
            <StatusBadge
              label={statusLabelFor('device', device)}
              tone={device.status === 'failed' ? 'error' : 'success'}
              icon={
                device.status === 'completed' ? 'checkmark-circle' : undefined
              }
            />
          }
        />
        <BackupOptionRow
          icon="cloud-outline"
          title="iCloud"
          subtitle="Coming in a future update"
          disabled
          badge={<StatusBadge label="Soon" tone="muted" />}
        />
        <BackupOptionRow
          icon="server-outline"
          title="Cloud backup"
          subtitle={backendSubtitle()}
          badge={backendBadge()}
          highlighted={backendEnabled && !backendPassphraseReady}
          onPress={backendEnabled ? onBackendConfigure : undefined}
          trailing={
            <BackupToggle
              enabled={backendEnabled}
              disabled={backend.status === 'in_progress'}
              onPress={() => {
                if (backendEnabled) {
                  onBackendEnabledChange(false);
                  return;
                }
                onBackendEnabledChange(true);
              }}
            />
          }
        />
        {backend.error ? (
          <Text style={styles.errorText}>{backend.error}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowHighlighted: {
    borderColor: 'rgba(232,180,90,0.35)',
    backgroundColor: 'rgba(232,180,90,0.06)',
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowTitleDisabled: {
    color: colors.textSecondary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeDefault: {
    backgroundColor: 'rgba(45,190,140,0.12)',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(90,209,166,0.12)',
  },
  badgeMuted: {
    backgroundColor: 'rgba(138,146,155,0.12)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(232,180,90,0.12)',
  },
  badgeError: {
    backgroundColor: 'rgba(224,113,90,0.12)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextDefault: {
    color: colors.accentBright,
  },
  badgeTextSuccess: {
    color: colors.positive,
  },
  badgeTextMuted: {
    color: colors.textTertiary,
  },
  badgeTextWarning: {
    color: '#E8B45A',
  },
  badgeTextError: {
    color: '#E0715A',
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: 'rgba(45,190,140,0.25)',
    borderColor: 'rgba(45,190,140,0.45)',
  },
  toggleTrackDisabled: {
    opacity: 0.45,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textSecondary,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentBright,
  },
  errorText: {
    fontSize: 12,
    color: '#E0715A',
    paddingHorizontal: spacing.xs,
  },
});
