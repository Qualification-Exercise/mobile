import * as Crypto from 'expo-crypto';
import { hashMnemonic, normalizeMnemonic } from './mnemonicHash';

const digestStringAsync = Crypto.digestStringAsync as jest.Mock;

describe('normalizeMnemonic', () => {
  it('trims, lower-cases, and collapses inner whitespace', () => {
    expect(normalizeMnemonic('  Alpha   BRAVO\tcharlie  ')).toBe(
      'alpha bravo charlie',
    );
  });
});

describe('hashMnemonic', () => {
  it('hashes the normalized phrase with SHA-256', async () => {
    const hash = await hashMnemonic('Alpha   BRAVO');
    expect(digestStringAsync).toHaveBeenCalledWith('SHA-256', 'alpha bravo');
    expect(hash).toBe('sha256:alpha bravo');
  });
});
