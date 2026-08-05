import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BottomSheet,
  PrimaryButton,
  SecondaryButton,
  colors,
  spacing,
} from '@shared/ui';
import { BackupPassphrasePrompt } from './BackupPassphrasePrompt';

type BackupPassphraseSheetProps = {
  visible: boolean;
  initialPassphrase?: string;
  initialConfirmPassphrase?: string;
  error?: string;
  onClose: () => void;
  onSave: (passphrase: string, confirmPassphrase: string) => void;
};

export function BackupPassphraseSheet({
  visible,
  initialPassphrase = '',
  initialConfirmPassphrase = '',
  error,
  onClose,
  onSave,
}: BackupPassphraseSheetProps) {
  const [passphrase, setPassphrase] = useState(initialPassphrase);
  const [confirmPassphrase, setConfirmPassphrase] = useState(
    initialConfirmPassphrase,
  );
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (visible) {
      setPassphrase(initialPassphrase);
      setConfirmPassphrase(initialConfirmPassphrase);
      setLocalError('');
    }
  }, [visible, initialPassphrase, initialConfirmPassphrase]);

  function handleSave() {
    if (!passphrase.trim()) {
      setLocalError('Enter a passphrase');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setLocalError('Passphrases do not match');
      return;
    }
    setLocalError('');
    onSave(passphrase, confirmPassphrase);
  }

  const displayError = localError || error;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Cloud backup passphrase"
    >
      <Text style={styles.description}>
        Choose a strong passphrase to encrypt your wallet on the server. It is
        separate from Face ID and cannot be recovered if lost.
      </Text>
      <BackupPassphrasePrompt
        showHeader={false}
        passphrase={passphrase}
        confirmPassphrase={confirmPassphrase}
        onPassphraseChange={value => {
          setPassphrase(value);
          setLocalError('');
        }}
        onConfirmPassphraseChange={value => {
          setConfirmPassphrase(value);
          setLocalError('');
        }}
        error={displayError}
      />
      <View style={styles.actions}>
        <PrimaryButton title="Save passphrase" onPress={handleSave} />
        <SecondaryButton title="Cancel" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
