import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
} from 'react-native';

/**
 * Wraps its children in a platform-aware `KeyboardAvoidingView` so form
 * content is lifted above the on-screen keyboard.
 *
 * Defaults to the `padding` behavior on iOS and relies on the native
 * `adjustResize` window behavior on Android. Both `behavior` and every other
 * `KeyboardAvoidingView` prop can be overridden per screen.
 */
export function KeyboardAvoidingView({
  behavior = Platform.OS === 'ios' ? 'padding' : undefined,
  ...props
}: KeyboardAvoidingViewProps) {
  return <RNKeyboardAvoidingView behavior={behavior} {...props} />;
}
