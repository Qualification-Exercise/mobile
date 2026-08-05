import { BackendApiError } from '@shared/api';
import { getBackendApiUrl } from '@shared/config/backend';
import { BackupPassphraseError } from '../types';

const PREFIX = '[BackendBackup]';

function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof BackendApiError) {
    return {
      name: error.name,
      code: error.code,
      status: error.status,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    const withCause = error as Error & { cause?: unknown };
    return {
      name: error.name,
      message: error.message,
      cause:
        withCause.cause instanceof Error
          ? { message: withCause.cause.message }
          : withCause.cause,
    };
  }

  return { value: String(error) };
}

export function logBackupStart(context: string): void {
  console.log(`${PREFIX} ${context} — api=${getBackendApiUrl()}`);
}

export function logBackupStep(
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (detail) {
    console.log(`${PREFIX} ${step}`, detail);
    return;
  }
  console.log(`${PREFIX} ${step}`);
}

export function logBackupSuccess(
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (detail) {
    console.log(`${PREFIX} ✓ ${step}`, detail);
    return;
  }
  console.log(`${PREFIX} ✓ ${step}`);
}

export function logBackupError(step: string, error: unknown): void {
  console.error(`${PREFIX} ✗ ${step}`, formatError(error));
}

export function summarizeAddressResults(
  addresses: Array<{
    network: string;
    success: boolean;
    address?: string;
    reason?: unknown;
  }>,
): Record<string, unknown> {
  return {
    total: addresses.length,
    succeeded: addresses.filter(entry => entry.success).length,
    failed: addresses
      .filter(entry => !entry.success)
      .map(entry => ({
        network: entry.network,
        reason:
          entry.reason instanceof Error
            ? entry.reason.message
            : String(entry.reason),
      })),
    primaryEvm: addresses.find(
      entry => entry.success && entry.network === 'ethereum',
    )?.address,
  };
}

export function blobSizeSummary(material: {
  encryptedEntropy: string;
  encryptedSeed: string;
}): Record<string, number> {
  return {
    entropyBase64Len: material.encryptedEntropy.length,
    seedBase64Len: material.encryptedSeed.length,
  };
}

export function toUserFacingBackupError(error: unknown): string {
  if (error instanceof BackupPassphraseError) {
    return error.message;
  }
  if (error instanceof BackendApiError) {
    if (error.code === 'BACKEND_GOOGLE_AUTH_MISCONFIGURED') {
      return 'Backend Google auth is not configured. Ask ops to set GOOGLE_WEB_CLIENT_ID on the server.';
    }
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Backend backup failed';
}
