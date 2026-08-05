const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1];
    const byte3 = bytes[index + 2];

    const triplet = (byte1 << 16) | ((byte2 ?? 0) << 8) | (byte3 ?? 0);

    output += BASE64_ALPHABET[(triplet >> 18) & 63];
    output += BASE64_ALPHABET[(triplet >> 12) & 63];
    output += byte2 === undefined ? '=' : BASE64_ALPHABET[(triplet >> 6) & 63];
    output += byte3 === undefined ? '=' : BASE64_ALPHABET[triplet & 63];
  }

  return output;
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.trim().replace(/[=]+$/, '');
  const output: number[] = [];

  for (let index = 0; index < normalized.length; index += 4) {
    const chunk = normalized.slice(index, index + 4);
    const values = chunk.split('').map(char => {
      const code = BASE64_ALPHABET.indexOf(char);
      if (code === -1) {
        throw new Error('Invalid base64 input');
      }
      return code;
    });

    while (values.length < 4) {
      values.push(0);
    }

    const triplet =
      (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3];

    output.push((triplet >> 16) & 255);
    if (chunk.length > 2) {
      output.push((triplet >> 8) & 255);
    }
    if (chunk.length > 3) {
      output.push(triplet & 255);
    }
  }

  return Uint8Array.from(output);
}

export function stringToUtf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function utf8BytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
