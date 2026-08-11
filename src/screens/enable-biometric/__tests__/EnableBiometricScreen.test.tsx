import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { EnableBiometricScreen } from '../EnableBiometricScreen';

const mockNavigation = {
  reset: jest.fn(),
};

const mockBiometryStore = {
  isEnrolled: true,
  enableBiometric: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@shared/store', () => ({
  useStore: () => ({ biometryStore: mockBiometryStore }),
}));

jest.mock('@shared/ui', () => {
  const ReactRuntime = require('react');
  const { Text, View } = require('react-native');
  const Button = ({ title, onPress }: Record<string, unknown>) =>
    ReactRuntime.createElement(
      View,
      { accessibilityLabel: title, onPress },
      ReactRuntime.createElement(Text, null, title),
    );

  return {
    PrimaryButton: Button,
    ScreenContainer: ({ children }: { children: React.ReactNode }) =>
      ReactRuntime.createElement(View, null, children),
    colors: {
      accentBright: '#0f0',
      background: '#000',
      surfaceAlt: '#111',
      textPrimary: '#fff',
      textSecondary: '#aaa',
    },
    radii: { sm: 8, xxl: 24 },
    spacing: { sm: 8, md: 12, xl: 24 },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBiometryStore.isEnrolled = true;
});

test('routes an enrolled user through existing-wallet unlock', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<EnableBiometricScreen />);
  });

  expect(mockNavigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'BiometricUnlock' }],
  });
});
