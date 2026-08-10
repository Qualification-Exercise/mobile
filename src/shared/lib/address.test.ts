import { isValidAddress } from './address';

// Representative valid addresses per network family.
const EVM_ADDRESS = '0x52908400098527886E0F7030069857D2E4169EE7';
const TRON_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const SPARK_ADDRESS = 'sp1qqqqqqqq';

describe('isValidAddress', () => {
  it('rejects an empty or whitespace-only address on any network', () => {
    expect(isValidAddress('ethereum', '')).toBe(false);
    expect(isValidAddress('bitcoin', '   ')).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidAddress('ethereum', `  ${EVM_ADDRESS}  `)).toBe(true);
  });

  describe('EVM networks', () => {
    it.each(['ethereum', 'arbitrum', 'polygon'] as const)(
      'accepts a 0x-prefixed 40-hex address on %s',
      network => {
        expect(isValidAddress(network, EVM_ADDRESS)).toBe(true);
      },
    );

    it('accepts a lowercase address (checksum not enforced)', () => {
      expect(isValidAddress('ethereum', EVM_ADDRESS.toLowerCase())).toBe(true);
    });

    it('rejects a wrong-length address', () => {
      expect(isValidAddress('ethereum', '0x1234')).toBe(false);
    });

    it('rejects an address without the 0x prefix', () => {
      expect(isValidAddress('ethereum', EVM_ADDRESS.slice(2))).toBe(false);
    });
  });

  describe('Tron', () => {
    it('accepts a base58check T-address', () => {
      expect(isValidAddress('tron', TRON_ADDRESS)).toBe(true);
    });

    it('rejects an address without the leading T', () => {
      expect(isValidAddress('tron', `A${TRON_ADDRESS.slice(1)}`)).toBe(false);
    });
  });

  describe('Bitcoin', () => {
    it('accepts a bech32 SegWit address', () => {
      expect(isValidAddress('bitcoin', BTC_ADDRESS)).toBe(true);
    });

    it('rejects a legacy base58 address', () => {
      expect(
        isValidAddress('bitcoin', '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'),
      ).toBe(false);
    });
  });

  describe('Spark', () => {
    it('accepts an sp1 address', () => {
      expect(isValidAddress('spark', SPARK_ADDRESS)).toBe(true);
    });

    it('accepts a bc1 address (Spark settles to Bitcoin)', () => {
      expect(isValidAddress('spark', BTC_ADDRESS)).toBe(true);
    });
  });

  describe('cross-network mismatches', () => {
    it('rejects a Tron address on an EVM network', () => {
      expect(isValidAddress('ethereum', TRON_ADDRESS)).toBe(false);
    });

    it('rejects an EVM address on Bitcoin', () => {
      expect(isValidAddress('bitcoin', EVM_ADDRESS)).toBe(false);
    });

    it('rejects a Bitcoin address on Tron', () => {
      expect(isValidAddress('tron', BTC_ADDRESS)).toBe(false);
    });
  });
});
