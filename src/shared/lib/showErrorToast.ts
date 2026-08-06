import Toast from 'react-native-toast-message';
import { type AppError, describeErrorSource } from './appError';

/** How long an error toast stays on screen before auto-dismissing (ms). */
const VISIBLE_MS = 6000;

/**
 * Surface a captured error to the user through `react-native-toast-message`,
 * the app's toast library. This replaces the former hand-rolled centered
 * overlay: the library owns queueing, the auto-dismiss timer, fade animation,
 * and tap/swipe-to-dismiss, so we no longer maintain any of that ourselves.
 *
 * It is a plain function over `Toast`'s module-singleton imperative API, so it
 * is reachable from producers that live outside the React tree — global error
 * handlers and the error boundary's lifecycle methods.
 *
 * In dev builds the error source (render, uncaught, promise, …) is appended so
 * it stays visible while debugging; production shows only the message.
 */
export function showErrorToast({ error, source }: AppError): void {
  const message = error.message || 'Unexpected error';

  Toast.show({
    type: 'error',
    text1: 'Something went wrong',
    text2: __DEV__ ? `${message} · ${describeErrorSource(source)}` : message,
    visibilityTime: VISIBLE_MS,
  });
}
