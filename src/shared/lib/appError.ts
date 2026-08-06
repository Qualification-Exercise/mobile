/**
 * Where a captured error originated. Used purely to label an error while
 * debugging — the source is surfaced to the user in dev builds only.
 *
 * - `render`  — thrown while React rendered the tree (JSX / lifecycle). Only
 *   these reach an error boundary.
 * - `fallback` — thrown while rendering the error boundary's own fallback UI,
 *   i.e. an error inside the error handler itself.
 * - `uncaught` — thrown outside React and swallowed by no `try/catch`: event
 *   handlers, `setTimeout` / `setInterval` callbacks, other sync code. These
 *   arrive through React Native's global `ErrorUtils` handler.
 * - `promise`  — a rejected promise that nothing `.catch()`-ed.
 */
export type AppErrorSource = 'render' | 'fallback' | 'uncaught' | 'promise';

/** A normalized error captured by a global handler or an error boundary. */
export type AppError = {
  error: Error;
  source: AppErrorSource;
  /** Whether the runtime considered the error fatal (crash-worthy). */
  isFatal: boolean;
};

const SOURCE_LABELS: Record<AppErrorSource, string> = {
  render: 'Render (JSX)',
  fallback: 'Error boundary',
  uncaught: 'Uncaught (event / async)',
  promise: 'Unhandled promise',
};

/** Short, human-readable label for an error source. Shown in dev builds only. */
export function describeErrorSource(source: AppErrorSource): string {
  return SOURCE_LABELS[source];
}

/**
 * Coerce an unknown thrown value into an `Error`. Global handlers and promise
 * rejections can hand us strings, plain objects, or `undefined`; downstream
 * code just wants a stable `.name` / `.message`.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(value));
  } catch {
    // `value` was circular or otherwise not serializable.
    return new Error(String(value));
  }
}
