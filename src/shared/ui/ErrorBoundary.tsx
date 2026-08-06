import { Component, type ReactNode } from 'react';
import { type AppErrorSource, showErrorToast } from '@shared/lib';

type ErrorBoundaryProps = {
  /** How to label errors this boundary catches (`render` or `fallback`). */
  source: Extract<AppErrorSource, 'render' | 'fallback'>;
  /** Rendered in place of `children` once an error is caught. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Generic React error boundary. Catches errors thrown while rendering its
 * subtree — the one error class global handlers cannot see — surfaces them in a
 * toast (so the user still sees them), and renders `fallback`.
 *
 * It is intentionally reusable so it can be nested: the root wraps the app to
 * catch render errors, and a second instance wraps the fallback itself to catch
 * errors thrown *inside* the error UI. See `RootErrorBoundary`.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    showErrorToast({
      error,
      // A crash in the fallback UI is unrecoverable in-place, so flag it fatal.
      isFatal: this.props.source === 'fallback',
      source: this.props.source,
    });
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;

    if (error) {
      return this.props.fallback(error, this.reset);
    }

    return this.props.children;
  }
}
