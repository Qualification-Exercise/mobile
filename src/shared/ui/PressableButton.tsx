import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing } from './tokens';

type PressableButtonProps = {
  title: string;
  onPress: () => void | Promise<void>;
  // Shown in place of `title` while an async `onPress` is running.
  busyTitle?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A bordered button that ignores re-taps while its `onPress` is in flight.
// When `onPress` returns a promise the button stays busy until it settles, so
// a single async handler covers both accidental double-taps and the full
// duration of the work — no external pending flag required.
export function PressableButton({
  title,
  onPress,
  busyTitle,
  disabled,
  style,
}: PressableButtonProps) {
  const [busy, setBusy] = useState(false);
  // A ref flips synchronously, so a second tap fired before React re-renders
  // is still ignored — the `busy` state alone updates too late to catch it.
  const inFlight = useRef(false);

  const handlePress = useCallback(async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      await onPress();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [onPress]);

  const isDisabled = disabled || busy;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
    >
      <Text style={styles.label}>{busy && busyTitle ? busyTitle : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.accentBright,
    fontSize: 16,
    fontWeight: '600',
  },
});
