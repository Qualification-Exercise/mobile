// The asset registry imports `BaseAsset` from the WDK, which drags in native
// Expo modules. Only the registry's plain data is under test here, so the WDK
// entry point is stubbed rather than transformed.
jest.mock('@tetherto/wdk-react-native-core', () => ({ BaseAsset: class {} }));

// Imported from the module rather than the `@shared/lib` barrel: the barrel
// also pulls in native Expo modules that have no place in a pure unit test.
import { buildPaymentUri, parsePaymentRequest } from '@shared/lib/paymentUri';

const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const RECIPIENT = '0xA4f2c9c2E4f2c9c2E4f2c9c2E4f2c9c2E4f2c9c2';

describe('parsePaymentRequest', () => {
  test('reads a bare address as the default asset', () => {
    expect(parsePaymentRequest(RECIPIENT, 'usdt-arbitrum')).toEqual({
      assetId: 'usdt-arbitrum',
      destination: RECIPIENT,
      amountBaseUnits: null,
    });
  });

  test('reads an EIP-681 ERC-20 transfer with an amount', () => {
    const uri = `ethereum:${USDT_ARBITRUM}@42161/transfer?address=${RECIPIENT}&uint256=25000000`;

    expect(parsePaymentRequest(uri, 'usdt-arbitrum')).toEqual({
      assetId: 'usdt-arbitrum',
      destination: RECIPIENT,
      amountBaseUnits: '25000000',
    });
  });

  test('resolves the token from the chain id, not the scheme', () => {
    const uri = `ethereum:${USDT_ARBITRUM}@42161/transfer?address=${RECIPIENT}`;

    expect(parsePaymentRequest(uri, 'usdt-ethereum')?.assetId).toBe(
      'usdt-arbitrum',
    );
  });

  test("reads a chain-only URI as that chain's gas coin", () => {
    expect(
      parsePaymentRequest(`ethereum:${RECIPIENT}@42161`, 'usdt-arbitrum'),
    ).toEqual({
      assetId: 'eth-arbitrum',
      destination: RECIPIENT,
      amountBaseUnits: null,
    });
  });

  test('round-trips a native receive URI', () => {
    const uri = buildPaymentUri('eth-arbitrum', RECIPIENT);

    expect(parsePaymentRequest(uri, 'usdt-arbitrum')?.assetId).toBe(
      'eth-arbitrum',
    );
  });

  test('converts BIP-21 decimal amounts to satoshis', () => {
    const uri =
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.001';

    expect(parsePaymentRequest(uri, 'usdt-arbitrum')).toEqual({
      assetId: 'btc-bitcoin',
      destination: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      amountBaseUnits: '100000',
    });
  });

  test('rejects payloads this wallet cannot pay', () => {
    // Malformed recipient, unknown token contract, and a non-integer amount.
    expect(parsePaymentRequest('0xnope', 'usdt-arbitrum')).toBeNull();
    expect(
      parsePaymentRequest(
        `ethereum:0x0000000000000000000000000000000000000001@42161/transfer?address=${RECIPIENT}`,
        'usdt-arbitrum',
      ),
    ).toBeNull();
    expect(
      parsePaymentRequest(
        `ethereum:${USDT_ARBITRUM}@42161/transfer?address=${RECIPIENT}&uint256=1.5`,
        'usdt-arbitrum',
      ),
    ).toBeNull();
  });

  test('round-trips the URI this wallet puts in its own receive QR', () => {
    const uri = buildPaymentUri('usdt-arbitrum', RECIPIENT);

    expect(parsePaymentRequest(uri, 'btc-bitcoin')).toEqual({
      assetId: 'usdt-arbitrum',
      destination: RECIPIENT,
      amountBaseUnits: null,
    });
  });
});
