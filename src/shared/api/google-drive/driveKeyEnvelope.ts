import { isValidEncryptionKey } from '@shared/lib/secretValidation';
import {
  DRIVE_KEY_ENVELOPE_SCHEMA_VERSION,
  DriveKeyEnvelopeError,
  type DriveKeyEnvelopeV1,
} from './types';

export const MAX_DRIVE_KEY_ENVELOPE_BYTES = 8 * 1024;
export const DRIVE_KEY_ENVELOPE_FILE_NAME = 'wallet-backup-key.json';

const ENVELOPE_KEYS = ['schemaVersion', 'encryptionKey'] as const;
const LEGACY_ENVELOPE_KEYS = [
  'schemaVersion',
  'encryptedSeedSha256',
  'encryptedEntropySha256',
  'encryptionKey',
] as const;

function utf8ByteLength(value: string): number {
  let byteLength = 0;

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint == null) {
      continue;
    }
    if (codePoint <= 0x7f) {
      byteLength += 1;
    } else if (codePoint <= 0x7ff) {
      byteLength += 2;
    } else if (codePoint <= 0xffff) {
      byteLength += 3;
    } else {
      byteLength += 4;
      index += 1;
    }
  }

  return byteLength;
}

function hasExactEnvelopeKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every(key => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function hasValidKeyEnvelopeFields(envelope: Record<string, unknown>): boolean {
  return (
    envelope.schemaVersion === DRIVE_KEY_ENVELOPE_SCHEMA_VERSION &&
    typeof envelope.encryptionKey === 'string' &&
    isValidEncryptionKey(envelope.encryptionKey)
  );
}

function isCurrentEnvelopeShape(value: unknown): value is DriveKeyEnvelopeV1 {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const envelope = value as Record<string, unknown>;
  return (
    hasExactEnvelopeKeys(envelope, ENVELOPE_KEYS) &&
    hasValidKeyEnvelopeFields(envelope)
  );
}

function isLegacyEnvelopeShape(
  value: unknown,
): value is DriveKeyEnvelopeV1 & Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const envelope = value as Record<string, unknown>;
  return (
    hasExactEnvelopeKeys(envelope, LEGACY_ENVELOPE_KEYS) &&
    hasValidKeyEnvelopeFields(envelope)
  );
}

function canonicalEnvelope(envelope: DriveKeyEnvelopeV1): DriveKeyEnvelopeV1 {
  return {
    schemaVersion: envelope.schemaVersion,
    encryptionKey: envelope.encryptionKey,
  };
}

export function createDriveKeyEnvelope(input: {
  encryptionKey: string;
}): DriveKeyEnvelopeV1 {
  if (!isValidEncryptionKey(input.encryptionKey)) {
    throw new DriveKeyEnvelopeError('invalid_envelope');
  }

  return {
    schemaVersion: DRIVE_KEY_ENVELOPE_SCHEMA_VERSION,
    encryptionKey: input.encryptionKey,
  };
}

export function serializeDriveKeyEnvelope(
  envelope: DriveKeyEnvelopeV1,
): string {
  if (!isCurrentEnvelopeShape(envelope)) {
    throw new DriveKeyEnvelopeError('invalid_envelope');
  }

  return JSON.stringify(canonicalEnvelope(envelope));
}

export function parseDriveKeyEnvelope(
  serializedEnvelope: string,
): DriveKeyEnvelopeV1 {
  if (utf8ByteLength(serializedEnvelope) > MAX_DRIVE_KEY_ENVELOPE_BYTES) {
    throw new DriveKeyEnvelopeError('envelope_too_large');
  }

  let value: unknown;
  try {
    value = JSON.parse(serializedEnvelope);
  } catch {
    throw new DriveKeyEnvelopeError('invalid_envelope');
  }

  if (!isCurrentEnvelopeShape(value) && !isLegacyEnvelopeShape(value)) {
    throw new DriveKeyEnvelopeError('invalid_envelope');
  }

  return canonicalEnvelope(value);
}
