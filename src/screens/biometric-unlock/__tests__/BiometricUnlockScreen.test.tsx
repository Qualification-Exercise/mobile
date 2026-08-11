import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { BiometricUnlockScreen } from '../BiometricUnlockScreen';

const mockNavigation = {
  reset: jest.fn(),
};
const mockVerify = jest.fn();
const mockGetStateStatus = jest.fn();
const mockUnlock = jest.fn();
const mockBiometryStore = { verify: mockVerify };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@shared/store', () => ({
  useStore: () => ({
    biometryStore: mockBiometryStore,
  }),
}));

jest.mock('@shared/lib/hooks/wallet', () => ({
  useWallet: () => ({
    getStateStatus: mockGetStateStatus,
    unlock: mockUnlock,
  }),
}));

jest.mock('@shared/ui', () => {
  const ReactRuntime = require('react');
  const { Text, View } = require('react-native');

  return {
    PrimaryButton: ({ title, onPress, disabled }: Record<string, unknown>) =>
      ReactRuntime.createElement(
        View,
        { accessibilityLabel: title, onPress, disabled },
        ReactRuntime.createElement(Text, null, title),
      ),
    ScreenContainer: ({ children }: { children: React.ReactNode }) =>
      ReactRuntime.createElement(View, null, children),
    colors: {
      accentBright: '#0f0',
      textPrimary: '#fff',
      textSecondary: '#aaa',
    },
    radii: { sm: 8, xxl: 24 },
    spacing: { sm: 8, xl: 24 },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue('unlocked');
  mockUnlock.mockResolvedValue(undefined);
});

it('uses the authoritative LOCKED state even when the wallet cache is not ready', async () => {
  mockGetStateStatus.mockReturnValue('LOCKED');
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<BiometricUnlockScreen />);
  });

  expect(mockUnlock).toHaveBeenCalledTimes(1);
  expect(mockNavigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });

  act(() => renderer.unmount());
});

it('opens wallet setup only when WDK explicitly reports NO_WALLET', async () => {
  mockGetStateStatus.mockReturnValue('NO_WALLET');
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<BiometricUnlockScreen />);
  });

  expect(mockUnlock).not.toHaveBeenCalled();
  expect(mockNavigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'WalletSetup' }],
  });

  act(() => renderer.unmount());
});
