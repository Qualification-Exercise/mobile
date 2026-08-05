import { zxcvbn } from 'zxcvbn-ts';
import type { SecretsKdfFloor } from '@shared/api';
import { BackupPassphraseError } from '../types';
import { logBackupStep } from './backendBackupLog';

export type PassphraseValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validatePassphrase(
  passphrase: string,
  confirmPassphrase: string,
  floor: SecretsKdfFloor,
): PassphraseValidationResult {
  if (passphrase !== confirmPassphrase) {
    logBackupStep('passphrase validation failed', { reason: 'mismatch' });
    return { valid: false, message: 'Passphrases do not match' };
  }

  if (passphrase.length < floor.minPassphraseLength) {
    logBackupStep('passphrase validation failed', {
      reason: 'too_short',
      minLength: floor.minPassphraseLength,
    });
    return {
      valid: false,
      message: `Passphrase must be at least ${floor.minPassphraseLength} characters`,
    };
  }

  const score = zxcvbn(passphrase).score;
  if (score < floor.minZxcvbnScore) {
    logBackupStep('passphrase validation failed', {
      reason: 'weak',
      score,
      minScore: floor.minZxcvbnScore,
    });
    return {
      valid: false,
      message: 'Passphrase is too weak — use a longer, less predictable phrase',
    };
  }

  return { valid: true };
}

export function assertPassphrase(
  passphrase: string,
  confirmPassphrase: string,
  floor: SecretsKdfFloor,
): void {
  const result = validatePassphrase(passphrase, confirmPassphrase, floor);
  if (!result.valid) {
    throw new BackupPassphraseError(result.message);
  }
}
