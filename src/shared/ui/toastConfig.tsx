import {
  BaseToast,
  ErrorToast,
  type ToastConfig,
} from 'react-native-toast-message';
import { colors, radii } from './tokens';

const cardStyle = {
  backgroundColor: colors.surface,
  borderLeftWidth: 4,
  borderRadius: radii.md,
  height: 'auto' as const,
  paddingVertical: 12,
};

const text1Style = {
  color: colors.textPrimary,
  fontSize: 14,
  fontWeight: '600' as const,
};

const text2Style = {
  color: colors.textSecondary,
  fontSize: 12,
};

/**
 * Dark-themed toast variants matching the app palette. Passed to the root
 * `<Toast />` so `Toast.show({ type: 'success' | 'error' })` renders on brand.
 */
export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={[cardStyle, { borderLeftColor: colors.accentBright }]}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={[cardStyle, { borderLeftColor: '#E0715A' }]}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
};
