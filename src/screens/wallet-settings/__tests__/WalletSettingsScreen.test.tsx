import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { WalletSettingsScreen } from '../WalletSettingsScreen';

const mockNavigation = {
  goBack: jest.fn(),
  reset: jest.fn(),
};

const mockWalletBackupStore = {
  busy: false,
  error: null as null | { code: string },
  localMessage: '',
  cloudMessage: '',
  localBackup: {
    available: false as boolean | null,
    loading: false,
    error: false,
  },
  cloudBackup: {
    available: false as boolean | null,
    loading: false,
    error: false,
  },
  checkLocalBackup: jest.fn(),
  saveLocalBackup: jest.fn(),
  checkCloudBackup: jest.fn(),
  backupExistingWallet: jest.fn(),
};

const mockWalletReaders = {
  getMnemonic: jest.fn(),
  deleteWallet: jest.fn(),
  getEncryptionKey: jest.fn(),
  getEncryptedSeed: jest.fn(),
  getEncryptedEntropy: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@shared/store', () => ({
  useStore: () => ({
    authStore: { signOut: jest.fn() },
    biometryStore: { verify: jest.fn() },
    walletBackupStore: mockWalletBackupStore,
  }),
}));

jest.mock('@shared/lib/hooks/wallet', () => ({
  useWallet: () => mockWalletReaders,
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

jest.mock('@shared/ui', () => {
  const ReactRuntime = require('react');
  const { Text, View } = require('react-native');
  const Button = ({ title, onPress, disabled }: Record<string, unknown>) =>
    ReactRuntime.createElement(
      View,
      { testID: 'mock-button', accessibilityLabel: title, onPress, disabled },
      ReactRuntime.createElement(Text, null, title),
    );

  return {
    AppIcon: () => null,
    HeaderBackButton: Button,
    PrimaryButton: Button,
    SecondaryButton: Button,
    ScreenContainer: ({ children }: { children: React.ReactNode }) =>
      ReactRuntime.createElement(View, null, children),
    SeedWordGrid: () => null,
    colors: {
      accent: '#0a0',
      accentBright: '#0f0',
      positive: '#0f0',
      surfaceAlt: '#111',
      textPrimary: '#fff',
      textSecondary: '#aaa',
    },
    radii: { sm: 8, md: 12 },
    spacing: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockWalletBackupStore.busy = false;
  mockWalletBackupStore.error = null;
  mockWalletBackupStore.localMessage = '';
  mockWalletBackupStore.cloudMessage = '';
  mockWalletBackupStore.localBackup = {
    available: false,
    loading: false,
    error: false,
  };
  mockWalletBackupStore.cloudBackup = {
    available: false,
    loading: false,
    error: false,
  };
});

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WalletSettingsScreen />);
  });
  return renderer!;
}

test('shows the action when Google Drive recovery is unavailable', async () => {
  const renderer = await renderScreen();

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Back up to Google Drive',
    }),
  ).toBeDefined();
  expect(mockWalletBackupStore.checkCloudBackup).toHaveBeenCalled();
});

test('always shows the independent local recovery setting', async () => {
  const renderer = await renderScreen();
  const button = renderer.root.findByProps({
    accessibilityLabel: 'Save on this device',
  });

  await ReactTestRenderer.act(() => button.props.onPress());

  expect(mockWalletBackupStore.checkLocalBackup).toHaveBeenCalledWith({
    getEncryptionKey: mockWalletReaders.getEncryptionKey,
    getEncryptedSeed: mockWalletReaders.getEncryptedSeed,
    getEncryptedEntropy: mockWalletReaders.getEncryptedEntropy,
  });
  expect(mockWalletBackupStore.saveLocalBackup).toHaveBeenCalledWith({
    getEncryptionKey: mockWalletReaders.getEncryptionKey,
    getEncryptedSeed: mockWalletReaders.getEncryptedSeed,
    getEncryptedEntropy: mockWalletReaders.getEncryptedEntropy,
  });
});

test('shows when the recovery key is already saved on this device', async () => {
  mockWalletBackupStore.localBackup.available = true;
  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).toContain('Saved on this device');
  expect(output).not.toContain('Save on this device');
});

test('shows completed recovery without an enable action', async () => {
  mockWalletBackupStore.cloudBackup.available = true;
  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).toContain('Google Drive backup is ready');
  expect(output).not.toContain('Back up to Google Drive');
});

test('offers a safe status retry after a provider error', async () => {
  mockWalletBackupStore.cloudBackup = {
    available: null,
    loading: false,
    error: true,
  };
  const renderer = await renderScreen();
  const button = renderer.root.findByProps({
    accessibilityLabel: 'Retry',
  });

  await ReactTestRenderer.act(() => button.props.onPress());
  expect(mockWalletBackupStore.checkCloudBackup).toHaveBeenCalledTimes(2);
});

test('disables recovery actions while an operation is running', async () => {
  mockWalletBackupStore.busy = true;
  const renderer = await renderScreen();
  const button = renderer.root.findByProps({
    accessibilityLabel: 'Back up to Google Drive',
  });

  expect(button.props.disabled).toBe(true);
});
