const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const MIN_CIPHERTEXT_BYTES = 29;
const MAX_CIPHERTEXT_BYTES = 10 * 1024;

export function getCanonicalBase64ByteLength(value: string): number | null {
  if (
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !CANONICAL_BASE64_PATTERN.test(value)
  ) {
    return null;
  }

  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

export function isValidEncryptionKey(value: string): boolean {
  return getCanonicalBase64ByteLength(value) === 32;
}

export function isValidEncryptedCredential(value: string): boolean {
  const byteLength = getCanonicalBase64ByteLength(value);
  return (
    byteLength != null &&
    byteLength >= MIN_CIPHERTEXT_BYTES &&
    byteLength <= MAX_CIPHERTEXT_BYTES
  );
}
