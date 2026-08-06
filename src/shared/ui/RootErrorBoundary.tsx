import { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorScreen } from './ErrorScreen';
import { colors, spacing } from './tokens';

/**
 * The app's root error boundary. Wraps the whole tree so any error thrown
 * during render lands on `ErrorScreen` instead of a white screen.
 *
 * A second, inner boundary wraps `ErrorScreen` itself: if the fallback UI
 * throws while rendering — the classic "error inside the error handler" — the
 * inner boundary catches it and drops to `MinimalFallback`, a View/Text-only
 * screen with no dependencies that could fail. Being the outermost boundary,
 * there is nothing above us to catch such an error, so we must contain it here
 * or React would unmount the entire app.
 */
export function RootErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary source="render" fallback={renderAppFallback}>
      {children}
    </ErrorBoundary>
  );
}

function renderAppFallback(error: Error, reset: () => void): ReactNode {
  return (
    <ErrorBoundary source="fallback" fallback={() => <MinimalFallback />}>
      {isFallbackPoisonError(error) ? (
        // Dev-only: the Errors Playground throws a marked error to make the
        // fallback UI itself crash, so the inner boundary → MinimalFallback
        // path can be exercised on demand.
        <FallbackThrower />
      ) : (
        <ErrorScreen error={error} onReset={reset} />
      )}
    </ErrorBoundary>
  );
}

function FallbackThrower(): never {
  throw new Error('Error thrown inside the error boundary fallback');
}

const FALLBACK_POISON_FLAG = '__devFallbackPoison';

type PoisonableError = Error & { [FALLBACK_POISON_FLAG]?: boolean };

/**
 * Create an error that, once caught by the root boundary, forces the fallback
 * UI to crash as well — the way to test "an error thrown in the error boundary
 * itself". Dev tooling only; production code never calls this.
 */
export function createFallbackPoisonError(): Error {
  const error: PoisonableError = new Error(
    'Render error that crashes the fallback UI',
  );
  error[FALLBACK_POISON_FLAG] = true;
  return error;
}

function isFallbackPoisonError(error: Error): boolean {
  return __DEV__ && (error as PoisonableError)[FALLBACK_POISON_FLAG] === true;
}

/**
 * Last-resort fallback. Deliberately trivial — inline styles, no buttons, no
 * imported components — so it cannot itself throw.
 */
function MinimalFallback() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Something went wrong.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
});
