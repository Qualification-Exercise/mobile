import * as Keychain from 'react-native-keychain';
import { loadBiometryEnabled, saveBiometryEnabled } from './biometryStorage';

const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const setGenericPassword = Keychain.setGenericPassword as jest.Mock;
const resetGenericPassword = Keychain.resetGenericPassword as jest.Mock;

const SERVICE = 'com.wdkqualification.biometryPreference';

describe('biometryStorage', () => {
  it('stores the flag when enabled', async () => {
    await saveBiometryEnabled(true);
    expect(setGenericPassword).toHaveBeenCalledWith('biometryEnabled', 'true', {
      service: SERVICE,
    });
  });

  it('clears the entry when disabled', async () => {
    await saveBiometryEnabled(false);
    expect(resetGenericPassword).toHaveBeenCalledWith({ service: SERVICE });
    expect(setGenericPassword).not.toHaveBeenCalled();
  });

  it('reads true only when the stored value is "true"', async () => {
    getGenericPassword.mockResolvedValueOnce({ password: 'true' });
    await expect(loadBiometryEnabled()).resolves.toBe(true);
  });

  it('defaults to false when nothing is stored', async () => {
    getGenericPassword.mockResolvedValueOnce(false);
    await expect(loadBiometryEnabled()).resolves.toBe(false);
  });
});
