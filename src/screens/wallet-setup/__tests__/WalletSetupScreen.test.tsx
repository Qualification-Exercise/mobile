import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { WalletSetupScreen } from '../WalletSetupScreen';

const mockNavigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
};

const mockWalletBackupStore = {
  busy: false,
  error: null as null | { code: string },
  localRecoveryKeyAvailable: true,
  cloudRecoveryKeyAvailable: true,
  backendWallet: { available: false, loading: false, error: false },
  restoreFromLocalBackup: jest.fn(),
  restoreFromCloudBackup: jest.fn(),
  checkBackendWalletPresence: jest.fn(),
  checkLocalRecoveryKeyPresence: jest.fn(),
  checkCloudRecoveryKeyPresence: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    const ReactRuntime = require('react');
    ReactRuntime.useEffect(callback, [callback]);
  },
}));

jest.mock('@shared/store', () => ({
  useStore: () => ({ walletBackupStore: mockWalletBackupStore }),
}));

jest.mock('@shared/lib', () => ({
  getWalletBackupErrorMessage: (error: { code: string }) => {
    if (error.code === 'wallet_already_exists') {
      return 'A wallet already exists on this device.';
    }
    return 'This backup is unavailable. Try another recovery method.';
  },
}));

jest.mock('@shared/lib/hooks/wallet', () => ({
  useWallet: () => ({ unlock: jest.fn() }),
}));

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
    PressableButton: Button,
    SecondaryButton: Button,
    ScreenContainer: ({ children }: { children: React.ReactNode }) =>
      ReactRuntime.createElement(View, null, children),
    colors: {
      accentBright: '#0f0',
      background: '#000',
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#888',
    },
    radii: { xxl: 24 },
    spacing: { sm: 8, md: 12, xl: 24 },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockWalletBackupStore.busy = false;
  mockWalletBackupStore.error = null;
  mockWalletBackupStore.localRecoveryKeyAvailable = true;
  mockWalletBackupStore.cloudRecoveryKeyAvailable = true;
  mockWalletBackupStore.backendWallet = {
    available: false,
    loading: false,
    error: false,
  };
  mockWalletBackupStore.restoreFromLocalBackup.mockResolvedValue(false);
  mockWalletBackupStore.restoreFromCloudBackup.mockResolvedValue(false);
  mockWalletBackupStore.checkBackendWalletPresence.mockResolvedValue(undefined);
  mockWalletBackupStore.checkLocalRecoveryKeyPresence.mockResolvedValue(
    undefined,
  );
  mockWalletBackupStore.checkCloudRecoveryKeyPresence.mockResolvedValue(
    undefined,
  );
});

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WalletSetupScreen />);
  });
  return renderer!;
}

test('shows both restore actions and keeps manual recovery available', async () => {
  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).toContain('Restore with recovery phrase');
  expect(output).toContain('Restore from backup on this device');
  expect(output).toContain('Restore from Google Drive');
  expect(
    mockWalletBackupStore.checkLocalRecoveryKeyPresence,
  ).toHaveBeenCalled();
  expect(
    mockWalletBackupStore.checkCloudRecoveryKeyPresence,
  ).toHaveBeenCalled();

  const manualButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore with recovery phrase',
  });
  await ReactTestRenderer.act(() => manualButton.props.onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('RestoreWallet');
});

test('shows one loader until every recovery option is checked', async () => {
  let finishCloudCheck: (() => void) | undefined;
  mockWalletBackupStore.checkCloudRecoveryKeyPresence.mockReturnValueOnce(
    new Promise<void>(resolve => {
      finishCloudCheck = resolve;
    }),
  );

  const renderer = await renderScreen();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Checking recovery options',
    }),
  ).toBeDefined();
  expect(JSON.stringify(renderer.toJSON())).not.toContain(
    'Restore with recovery phrase',
  );

  await ReactTestRenderer.act(async () => {
    finishCloudCheck?.();
  });

  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Restore with recovery phrase',
  );
});

test('hides device restore when no local recovery key exists', async () => {
  mockWalletBackupStore.localRecoveryKeyAvailable = false;

  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).not.toContain('Restore from backup on this device');
  expect(output).toContain('Restore with recovery phrase');
  expect(output).toContain('Restore from Google Drive');
});

test('hides Google Drive restore when no Drive recovery key exists', async () => {
  mockWalletBackupStore.cloudRecoveryKeyAvailable = false;

  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).not.toContain('Restore from Google Drive');
  expect(output).toContain('Restore with recovery phrase');
  expect(output).toContain('Restore from backup on this device');
});

test('hides wallet creation when a backend backup exists', async () => {
  mockWalletBackupStore.backendWallet.available = true;
  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).not.toContain('Create new wallet');
  expect(output).toContain('Restore with recovery phrase');
  expect(output).toContain('Restore from backup on this device');
  expect(output).toContain('Restore from Google Drive');
  expect(mockWalletBackupStore.checkBackendWalletPresence).toHaveBeenCalled();
});

test('disables every setup action while recovery is running', async () => {
  mockWalletBackupStore.busy = true;
  const renderer = await renderScreen();

  expect(
    renderer.root
      .findAllByProps({ testID: 'mock-button' })
      .every(button => button.props.disabled === true),
  ).toBe(true);
});

test.each([
  ['backup_unavailable', 'This backup is unavailable'],
  ['wallet_already_exists', 'A wallet already exists on this device'],
])('shows a safe %s error', async (code, expectedMessage) => {
  mockWalletBackupStore.error = { code };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

  const renderer = await renderScreen();
  const localRestoreButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore from backup on this device',
  });
  await ReactTestRenderer.act(() => localRestoreButton.props.onPress());

  expect(alert).toHaveBeenCalledWith(
    'Could not restore wallet',
    expect.stringContaining(expectedMessage),
  );
  alert.mockRestore();
});

test('navigates to Home after local backup restore succeeds', async () => {
  mockWalletBackupStore.restoreFromLocalBackup.mockResolvedValue(true);
  const renderer = await renderScreen();
  const localRestoreButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore from backup on this device',
  });

  await ReactTestRenderer.act(() => localRestoreButton.props.onPress());

  expect(mockNavigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
});

test('navigates to Home only after cloud restore succeeds', async () => {
  mockWalletBackupStore.restoreFromCloudBackup.mockResolvedValue(true);
  const renderer = await renderScreen();
  const cloudRestoreButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore from Google Drive',
  });

  await ReactTestRenderer.act(() => cloudRestoreButton.props.onPress());

  expect(mockNavigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
});

test('does not expose cloud backup details', async () => {
  mockWalletBackupStore.error = { code: 'backup_unavailable' };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const renderer = await renderScreen();
  const cloudRestoreButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore from Google Drive',
  });

  await ReactTestRenderer.act(() => cloudRestoreButton.props.onPress());

  expect(alert).toHaveBeenCalledWith(
    'Could not restore wallet',
    'This backup is unavailable. Try another recovery method.',
  );
  alert.mockRestore();
});
