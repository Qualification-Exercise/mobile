import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { WalletSetupScreen } from '../WalletSetupScreen';

const mockNavigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
};

const mockWalletBackupStore = {
  restorePhase: 'idle',
  restoreError: null as string | null,
  restoreBackupIssue: null as string | null,
  restoreDiagnostics: null as null | Record<string, number>,
  remoteBackupPresence: 'absent',
  resetRestoreState: jest.fn(),
  restoreFromLocalBackup: jest.fn(),
  checkRemoteBackupPresence: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@shared/store', () => ({
  useStore: () => ({ walletBackupStore: mockWalletBackupStore }),
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
  mockWalletBackupStore.restorePhase = 'idle';
  mockWalletBackupStore.restoreError = null;
  mockWalletBackupStore.restoreBackupIssue = null;
  mockWalletBackupStore.restoreDiagnostics = null;
  mockWalletBackupStore.remoteBackupPresence = 'absent';
  mockWalletBackupStore.restoreFromLocalBackup.mockResolvedValue(false);
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

  const manualButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore with recovery phrase',
  });
  await ReactTestRenderer.act(() => manualButton.props.onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('RestoreWallet');
});

test('hides wallet creation when a backend backup exists', async () => {
  mockWalletBackupStore.remoteBackupPresence = 'present';
  const renderer = await renderScreen();
  const output = JSON.stringify(renderer.toJSON());

  expect(output).not.toContain('Create new wallet');
  expect(output).toContain('Restore with recovery phrase');
  expect(output).toContain('Restore from backup on this device');
  expect(mockWalletBackupStore.checkRemoteBackupPresence).toHaveBeenCalled();
});

test('shows restore progress and disables every setup action', async () => {
  mockWalletBackupStore.restorePhase = 'loading';
  const renderer = await renderScreen();

  expect(JSON.stringify(renderer.toJSON())).toContain('Restoring backup');
  expect(
    renderer.root
      .findAllByProps({ testID: 'mock-button' })
      .every(button => button.props.disabled === true),
  ).toBe(true);
});

test.each([
  ['backup_unavailable', 'local_key_missing', 'The wallet backup is missing'],
  ['backup_unavailable', 'remote_missing', 'The wallet backup is missing'],
  ['backup_unavailable', 'remote_ambiguous', 'The wallet backup is missing'],
  ['wallet_already_exists', null, 'A wallet already exists on this device'],
])('shows a safe %s error', async (code, issue, expectedMessage) => {
  mockWalletBackupStore.restorePhase = 'failed';
  mockWalletBackupStore.restoreError = code;
  mockWalletBackupStore.restoreBackupIssue = issue;
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

  expect(mockWalletBackupStore.resetRestoreState).toHaveBeenCalled();
  expect(mockNavigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
});

test('shows exact record counts for genuinely different backups', async () => {
  mockWalletBackupStore.restorePhase = 'failed';
  mockWalletBackupStore.restoreError = 'backup_unavailable';
  mockWalletBackupStore.restoreBackupIssue = 'remote_ambiguous';
  mockWalletBackupStore.restoreDiagnostics = {
    seedRecordCount: 3,
    distinctSeedCount: 2,
    entropyRecordCount: 2,
    distinctEntropyCount: 2,
  };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

  const renderer = await renderScreen();
  const localRestoreButton = renderer.root.findByProps({
    accessibilityLabel: 'Restore from backup on this device',
  });
  await ReactTestRenderer.act(() => localRestoreButton.props.onPress());

  expect(alert).toHaveBeenCalledWith(
    'Could not restore wallet',
    'Backend returned 3 seed records (2 distinct) and 2 entropy records (2 distinct).',
  );
  alert.mockRestore();
});
