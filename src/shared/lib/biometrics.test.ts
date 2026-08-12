import * as LocalAuthentication from 'expo-local-authentication';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isDevicePasscodeAvailable,
} from './biometrics';

const hasHardwareAsync = LocalAuthentication.hasHardwareAsync as jest.Mock;
const isEnrolledAsync = LocalAuthentication.isEnrolledAsync as jest.Mock;
const getEnrolledLevelAsync =
  LocalAuthentication.getEnrolledLevelAsync as jest.Mock;
const authenticateAsync = LocalAuthentication.authenticateAsync as jest.Mock;

describe('isBiometricAvailable', () => {
  it('is true only when hardware exists and a credential is enrolled', async () => {
    await expect(isBiometricAvailable()).resolves.toBe(true);
  });

  it('is false when hardware or enrolment is missing', async () => {
    hasHardwareAsync.mockResolvedValueOnce(false);
    await expect(isBiometricAvailable()).resolves.toBe(false);

    isEnrolledAsync.mockResolvedValueOnce(false);
    await expect(isBiometricAvailable()).resolves.toBe(false);
  });

  it('is false when the native check throws', async () => {
    hasHardwareAsync.mockRejectedValueOnce(new Error('native'));
    await expect(isBiometricAvailable()).resolves.toBe(false);
  });
});

describe('isDevicePasscodeAvailable', () => {
  it('is true when the enrolled level is at least a device secret', async () => {
    getEnrolledLevelAsync.mockResolvedValueOnce(
      LocalAuthentication.SecurityLevel.SECRET,
    );
    await expect(isDevicePasscodeAvailable()).resolves.toBe(true);
  });

  it('is false when no secret is enrolled', async () => {
    getEnrolledLevelAsync.mockResolvedValueOnce(
      LocalAuthentication.SecurityLevel.NONE,
    );
    await expect(isDevicePasscodeAvailable()).resolves.toBe(false);
  });

  it('is false when the native check throws', async () => {
    getEnrolledLevelAsync.mockRejectedValueOnce(new Error('native'));
    await expect(isDevicePasscodeAvailable()).resolves.toBe(false);
  });
});

describe('authenticateWithBiometrics', () => {
  it('reports success', async () => {
    authenticateAsync.mockResolvedValueOnce({ success: true });
    await expect(authenticateWithBiometrics('unlock')).resolves.toEqual({
      success: true,
    });
  });

  it('surfaces the OS error code on failure', async () => {
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: 'user_cancel',
    });
    await expect(authenticateWithBiometrics('unlock')).resolves.toEqual({
      success: false,
      error: 'user_cancel',
    });
  });

  it('maps a native throw to the unknown sentinel', async () => {
    authenticateAsync.mockRejectedValueOnce(new Error('native'));
    await expect(authenticateWithBiometrics('unlock')).resolves.toEqual({
      success: false,
      error: 'unknown',
    });
  });
});
