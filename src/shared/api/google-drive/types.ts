export const DRIVE_KEY_ENVELOPE_SCHEMA_VERSION = 1 as const;

export type DriveKeyEnvelopeV1 = {
  schemaVersion: typeof DRIVE_KEY_ENVELOPE_SCHEMA_VERSION;
  encryptionKey: string;
};

export type DriveKeyEnvelopeErrorCode =
  | 'invalid_envelope'
  | 'envelope_too_large';

const SAFE_ERROR_MESSAGES: Record<DriveKeyEnvelopeErrorCode, string> = {
  invalid_envelope: 'The cloud wallet backup key is invalid.',
  envelope_too_large: 'The cloud wallet backup key is too large.',
};

export class DriveKeyEnvelopeError extends Error {
  constructor(readonly code: DriveKeyEnvelopeErrorCode) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = 'DriveKeyEnvelopeError';
  }

  toJSON(): {
    name: string;
    code: DriveKeyEnvelopeErrorCode;
    message: string;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}
