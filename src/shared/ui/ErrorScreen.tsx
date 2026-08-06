import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { ScreenContainer } from './ScreenContainer';
import { colors, spacing } from './tokens';

type ErrorScreenProps = {
  error: Error;
  onReset: () => void;
};

/**
 * Full-screen fallback shown when a render error takes down the app tree. The
 * error's details also surface in the centered toast; this screen gives the
 * user something to look at (and a way to recover) once that toast fades.
 *
 * The concrete message is shown in dev only — production users get a generic,
 * non-leaky line.
 */
export function ErrorScreen({ error, onReset }: ErrorScreenProps) {
  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {__DEV__
            ? error.message || 'Unknown render error'
            : 'The app hit an unexpected error. Please try again.'}
        </Text>
      </View>
      <PrimaryButton title="Try again" onPress={onReset} style={styles.button} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xxxl,
  },
});
