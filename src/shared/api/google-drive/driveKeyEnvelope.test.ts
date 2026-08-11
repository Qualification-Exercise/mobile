import {
  DRIVE_KEY_ENVELOPE_FILE_NAME,
  MAX_DRIVE_KEY_ENVELOPE_BYTES,
  createDriveKeyEnvelope,
  parseDriveKeyEnvelope,
  serializeDriveKeyEnvelope,
} from './driveKeyEnvelope';
import type { DriveKeyEnvelopeV1 } from './types';

const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

function createFixture(): {
  envelope: DriveKeyEnvelopeV1;
  serialized: string;
} {
  const envelope = createDriveKeyEnvelope({
    encryptionKey: ENCRYPTION_KEY,
  });

  return {
    envelope,
    serialized: serializeDriveKeyEnvelope(envelope),
  };
}

describe('Drive key envelope', () => {
  it('uses one stable file name for the single wallet backup', () => {
    expect(DRIVE_KEY_ENVELOPE_FILE_NAME).toBe('wallet-backup-key.json');
  });

  it('creates, serializes, and strictly parses a valid envelope', () => {
    const { envelope, serialized } = createFixture();

    expect(parseDriveKeyEnvelope(serialized)).toEqual(envelope);
  });

  it('reads the previous envelope format but discards its checksum fields', () => {
    const legacyEnvelope = JSON.stringify({
      schemaVersion: 1,
      encryptedSeedSha256: 'a'.repeat(64),
      encryptedEntropySha256: 'b'.repeat(64),
      encryptionKey: ENCRYPTION_KEY,
    });

    expect(parseDriveKeyEnvelope(legacyEnvelope)).toEqual({
      schemaVersion: 1,
      encryptionKey: ENCRYPTION_KEY,
    });
  });

  it.each([
    ['schemaVersion', 2],
    ['encryptionKey', Buffer.alloc(31).toString('base64')],
  ])('rejects an invalid %s field', (field, value) => {
    const { envelope } = createFixture();
    const invalid = { ...envelope, [field]: value };

    expect(() => parseDriveKeyEnvelope(JSON.stringify(invalid))).toThrow(
      expect.objectContaining({ code: 'invalid_envelope' }),
    );
  });

  it('rejects missing and extra fields', () => {
    const { envelope } = createFixture();
    const missingField: Partial<DriveKeyEnvelopeV1> = { ...envelope };
    delete missingField.encryptionKey;
    const extraField = { ...envelope, email: 'person@example.com' };

    expect(() => parseDriveKeyEnvelope(JSON.stringify(missingField))).toThrow(
      expect.objectContaining({ code: 'invalid_envelope' }),
    );
    expect(() => parseDriveKeyEnvelope(JSON.stringify(extraField))).toThrow(
      expect.objectContaining({ code: 'invalid_envelope' }),
    );
  });

  it('rejects noncanonical Base64 even when it represents a 32-byte key', () => {
    const { envelope } = createFixture();
    const invalid = {
      ...envelope,
      encryptionKey: envelope.encryptionKey.slice(0, -1),
    };

    expect(() => parseDriveKeyEnvelope(JSON.stringify(invalid))).toThrow(
      expect.objectContaining({ code: 'invalid_envelope' }),
    );
  });

  it('rejects malformed JSON and oversized content before parsing', () => {
    expect(() => parseDriveKeyEnvelope('{')).toThrow(
      expect.objectContaining({ code: 'invalid_envelope' }),
    );
    expect(() =>
      parseDriveKeyEnvelope('x'.repeat(MAX_DRIVE_KEY_ENVELOPE_BYTES + 1)),
    ).toThrow(expect.objectContaining({ code: 'envelope_too_large' }));
  });

  it('does not retain secrets or rejected envelope values in errors', () => {
    const secretKey = Buffer.alloc(32, 99).toString('base64');
    const rejectedPayload = JSON.stringify({ encryptionKey: secretKey });

    let caught: unknown;
    try {
      parseDriveKeyEnvelope(rejectedPayload);
    } catch (error) {
      caught = error;
    }

    const rendered = `${String(caught)} ${JSON.stringify(caught)}`;
    expect(rendered).not.toContain(secretKey);
    expect(rendered).not.toContain(rejectedPayload);
  });

  it('rejects invalid creation inputs with safe typed errors', () => {
    expect(() =>
      createDriveKeyEnvelope({
        encryptionKey: Buffer.alloc(31).toString('base64'),
      }),
    ).toThrow(expect.objectContaining({ code: 'invalid_envelope' }));
  });

  it('rejects invalid envelopes during serialization', () => {
    expect(() =>
      serializeDriveKeyEnvelope({
        schemaVersion: 1,
        encryptionKey: 'invalid',
      }),
    ).toThrow(expect.objectContaining({ code: 'invalid_envelope' }));
  });

  it.each(['null', '[]'])(
    'rejects the non-object JSON value %s',
    serialized => {
      expect(() => parseDriveKeyEnvelope(serialized)).toThrow(
        expect.objectContaining({ code: 'invalid_envelope' }),
      );
    },
  );

  it('counts multibyte input by UTF-8 byte length', () => {
    expect(() => parseDriveKeyEnvelope('é€😀')).toThrow(
      expect.objectContaining({ code: 'invalid_envelope' }),
    );
  });
});
