import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { colors, createFallbackPoisonError, radii, spacing } from '@shared/ui';

/** Error kinds that must originate from a render-phase throw to be caught. */
type BoundaryErrorKind = 'render' | 'fallback';

type TriggerContext = {
  /**
   * Flip local state so this component re-renders and throws *during render* —
   * the only kind of error the root boundary can catch. See the throw below.
   */
  crashBoundary: (kind: BoundaryErrorKind) => void;
  /** Leave the dev menu so the resulting error toast is visible over the app. */
  leaveMenu: () => void;
};

type ErrorTrigger = {
  key: string;
  title: string;
  subtitle: string;
  run: (ctx: TriggerContext) => void;
};

const TRIGGERS: ErrorTrigger[] = [
  {
    key: 'render',
    title: 'Render (JSX) error',
    subtitle: 'Throws during render — caught by the root error boundary',
    run: ({ crashBoundary }) => crashBoundary('render'),
  },
  {
    key: 'event-handler',
    title: 'Event handler error',
    subtitle: 'Throws synchronously inside an onPress handler',
    run: ({ leaveMenu }) => {
      leaveMenu();
      throw new Error('Error thrown from an event handler');
    },
  },
  {
    key: 'set-timeout',
    title: 'setTimeout error',
    subtitle: 'Throws from a deferred timer callback',
    run: ({ leaveMenu }) => {
      leaveMenu();
      setTimeout(() => {
        throw new Error('Error thrown from a setTimeout callback');
      }, 0);
    },
  },
  {
    key: 'set-interval',
    title: 'setInterval error',
    subtitle: 'Throws once from an interval callback',
    run: ({ leaveMenu }) => {
      leaveMenu();
      const intervalId = setInterval(() => {
        // Clear first so the error is raised a single time, not every tick.
        clearInterval(intervalId);
        throw new Error('Error thrown from a setInterval callback');
      }, 0);
    },
  },
  {
    key: 'promise',
    title: 'Unhandled promise rejection',
    subtitle: 'Rejects a promise with no .catch()',
    run: ({ leaveMenu }) => {
      leaveMenu();
      // Intentionally left un-caught so the global rejection tracker sees it.
      Promise.reject(new Error('Unhandled promise rejection'));
    },
  },
  {
    key: 'fallback',
    title: 'Error boundary (fallback) error',
    subtitle: 'Crashes the fallback UI → last-resort minimal fallback',
    run: ({ crashBoundary }) => crashBoundary('fallback'),
  },
];

/**
 * A dev-only grid of buttons, one per error kind the app is expected to catch.
 *
 * Global-handler errors (event handler, timers, promises) close the menu first
 * so the resulting error toast is visible, then throw. Boundary errors are
 * different: an error boundary only catches throws that happen *during render*
 * of its subtree, so those buttons flip local state and this component throws
 * on the next render — which the root boundary (above this screen) then catches.
 */
export function ErrorsPlayground() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [boundaryError, setBoundaryError] = useState<BoundaryErrorKind | null>(
    null,
  );

  if (boundaryError) {
    throw boundaryError === 'fallback'
      ? createFallbackPoisonError()
      : new Error('Render error thrown during JSX rendering');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Tap a button to raise that error. Watch for the error toast; in dev
        builds it is tagged with the error source.
      </Text>

      {TRIGGERS.map(trigger => (
        <Pressable
          key={trigger.key}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() =>
            trigger.run({
              crashBoundary: setBoundaryError,
              leaveMenu: () => navigation.goBack(),
            })
          }
        >
          <Text style={styles.rowTitle}>{trigger.title}</Text>
          <Text style={styles.rowSubtitle}>{trigger.subtitle}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  row: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.negative,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
