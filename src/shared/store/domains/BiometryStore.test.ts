import {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from '../../lib/biometrics';
import {
  loadBiometryEnabled,
  saveBiometryEnabled,
} from '../../lib/biometryStorage';
import { BiometryStore } from './BiometryStore';

jest.mock('../../lib/biometrics', () => ({
  isBiometricAvailable: jest.fn(),
  authenticateWithBiometrics: jest.fn(),
}));
jest.mock('../../lib/biometryStorage', () => ({
  loadBiometryEnabled: jest.fn(),
  saveBiometryEnabled: jest.fn().mockResolvedValue(undefined),
}));

const mockAvailable = isBiometricAvailable as jest.Mock;
const mockAuthenticate = authenticateWithBiometrics as jest.Mock;
const mockLoad = loadBiometryEnabled as jest.Mock;
const mockSave = saveBiometryEnabled as jest.Mock;

describe('BiometryStore.hydrate', () => {
  it('loads the enrolment flag and hardware availability', async () => {
    mockLoad.mockResolvedValue(true);
    mockAvailable.mockResolvedValue(true);

    const store = new BiometryStore();
    await store.hydrate();

    expect(store.isEnrolled).toBe(true);
    expect(store.isAvailable).toBe(true);
    expect(store.isHydrated).toBe(true);
  });
});

describe('BiometryStore.enableBiometric', () => {
  it('persists enrolment after a successful scan', async () => {
    mockAvailable.mockResolvedValue(true);
    mockAuthenticate.mockResolvedValue({ success: true });

    const store = new BiometryStore();
    await expect(store.enableBiometric('unlock')).resolves.toBe('unlocked');
    expect(mockSave).toHaveBeenCalledWith(true);
    expect(store.isEnrolled).toBe(true);
  });

  it('does not enrol when biometrics are unavailable', async () => {
    mockAvailable.mockResolvedValue(false);

    const store = new BiometryStore();
    await expect(store.enableBiometric('unlock')).resolves.toBe('unavailable');
    expect(mockSave).not.toHaveBeenCalled();
    expect(store.isEnrolled).toBe(false);
  });
});

describe('BiometryStore.verify', () => {
  it('maps a revoked permission and a plain failure', async () => {
    mockAvailable.mockResolvedValue(true);

    mockAuthenticate.mockResolvedValueOnce({
      success: false,
      error: 'not_available',
    });
    const store = new BiometryStore();
    await expect(store.verify('unlock')).resolves.toBe('permission-denied');

    mockAuthenticate.mockResolvedValueOnce({
      success: false,
      error: 'user_cancel',
    });
    await expect(store.verify('unlock')).resolves.toBe('failed');
  });
});

describe('BiometryStore.reset', () => {
  it('clears the persisted preference', async () => {
    const store = new BiometryStore();
    store.isEnrolled = true;
    await store.reset();
    expect(mockSave).toHaveBeenCalledWith(false);
    expect(store.isEnrolled).toBe(false);
  });
});
