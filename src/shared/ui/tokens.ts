import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#121820',
  accent: '#26A17B',
  accentBright: '#2DBE8C',
  accentMuted: 'rgba(45,190,140,0.14)',
  surface: '#1A222C',
  surfaceAlt: '#212B36',
  surfaceElevated: '#2A3542',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.2)',
  textPrimary: '#F3F6F8',
  textSecondary: '#A2ADB8',
  textTertiary: '#79838F',
  positive: '#5AD1A6',
  negative: '#E5534B',
  pink: '#EC4899',
  blue: '#3B82F6',
} as const;

export const radii = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const shadows: Record<'card' | 'floating', ViewStyle> = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 3 },
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
    },
    default: { elevation: 8 },
  }),
};

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  body: {
    fontSize: 14.5,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;
