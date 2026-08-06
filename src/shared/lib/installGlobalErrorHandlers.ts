import type { ErrorUtils as ErrorUtilsInterface } from 'react-native';
import { toError } from './appError';
import { showErrorToast } from './showErrorToast';

// `ErrorUtils` is a React Native runtime global with no importable value
// export, so we describe it for TypeScript rather than import it.
declare const ErrorUtils: ErrorUtilsInterface;

type RejectionTrackingOptions = {
  allRejections: boolean;
  onUnhandled: (id: number, error: unknown) => void;
  onHandled: (id: number) => void;
};

let installed = false;

/**
 * Route the errors a React error boundary can never see into a toast so the
 * user still sees them:
 *
 * - synchronous throws outside React — event handlers, `setTimeout` /
 *   `setInterval` callbacks, other uncaught code — via `ErrorUtils`;
 * - rejected promises that nothing `.catch()`-ed, via the promise polyfill's
 *   rejection tracking.
 *
 * The pre-existing handlers are preserved and still invoked, so React Native's
 * dev redbox and native crash reporting keep working — we only *add* the toast,
 * never suppress the original behavior.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;

  installUncaughtErrorHandler();
  installUnhandledRejectionHandler();
}

function installUncaughtErrorHandler(): void {
  const previousHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    showErrorToast({
      error: toError(error),
      source: 'uncaught',
      isFatal: Boolean(isFatal),
    });

    // Defer to the default handler (redbox in dev, native crash reporting in
    // prod) so we layer the toast on top instead of hiding real crashes.
    previousHandler?.(error, isFatal);
  });
}

function installUnhandledRejectionHandler(): void {
  // React Native polyfills `global.Promise` with the `promise` package and
  // exposes rejection tracking through this internal entrypoint. Both requires
  // are guarded so a future runtime change (e.g. native promises) degrades to
  // "no promise toast" instead of crashing at startup.
  let tracking: { enable: (options: RejectionTrackingOptions) => void };
  try {
    tracking = require('promise/setimmediate/rejection-tracking');
  } catch {
    return;
  }

  // Enabling tracking replaces React Native's own handler (which logs
  // unhandled rejections to the dev redbox), so we re-add a dev-only console
  // warning to keep that diagnostic signal alongside the toast.
  tracking.enable({
    allRejections: true,
    onUnhandled: (id, rejection) => {
      const error = toError(rejection);
      showErrorToast({ error, source: 'promise', isFatal: false });

      if (__DEV__) {
        console.warn(`Unhandled promise rejection (id: ${id})`, error);
      }
    },
    // A rejection that gets a late `.catch` is no longer a problem — nothing to
    // report, but the callback must exist for the tracker to stay balanced.
    onHandled: () => {},
  });
}
