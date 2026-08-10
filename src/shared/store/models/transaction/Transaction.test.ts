import type { TransactionDTO } from '@shared/api';
import { shortenAddress, toTransaction } from './Transaction';

describe('shortenAddress', () => {
  it('leaves a short address untouched', () => {
    expect(shortenAddress('0x1234')).toBe('0x1234');
  });

  it('elides the middle of a long address', () => {
    expect(shortenAddress('0x52908400098527886E0F7030069857D2E4169EE7')).toBe(
      '0x5290…9EE7',
    );
  });
});

// A minimal server row; each test overrides only the fields it exercises.
function makeDto(overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: 'tx-1',
    type: 'transfer',
    chain: 'evm',
    srcChainId: 42161,
    txHash: '0xhash',
    outputIndex: 0,
    direction: 'in',
    token: 'USDT',
    amount: '25000000',
    usdValue: null,
    from: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    to: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    fee: null,
    status: 'confirmed',
    failureReason: null,
    confirmations: 3,
    requiredConfirmations: 6,
    claimId: null,
    source: 'indexer',
    at: new Date().toISOString(),
    ...overrides,
  };
}

describe('toTransaction', () => {
  it('resolves a known token from the registry and shows the sender', () => {
    const tx = toTransaction(makeDto({ direction: 'in' }));
    expect(tx).toMatchObject({
      direction: 'in',
      decimals: 6,
      symbol: 'USDT',
      assetId: 'usdt-arbitrum',
      status: 'confirmed',
      counterparty: '0xAAAA…AAAA',
    });
  });

  it('shows the recipient for an outgoing transfer', () => {
    expect(toTransaction(makeDto({ direction: 'out' })).counterparty).toBe(
      '0xBBBB…BBBB',
    );
  });

  it('keeps an unknown token raw with zero decimals and no asset id', () => {
    const tx = toTransaction(makeDto({ token: 'xyz' }));
    expect(tx).toMatchObject({ decimals: 0, symbol: 'XYZ', assetId: null });
  });

  it('maps an unrecognised status to pending', () => {
    expect(toTransaction(makeDto({ status: 'weird' })).status).toBe('pending');
  });

  it('labels today and yesterday relative to now', () => {
    const today = toTransaction(makeDto({ at: new Date().toISOString() }));
    expect(today.date).toBe('Today');

    const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString();
    expect(toTransaction(makeDto({ at: yesterdayIso })).date).toBe('Yesterday');
  });

  it('shows a calendar date for anything older than yesterday', () => {
    const old = toTransaction(makeDto({ at: '2020-01-15T12:00:00.000Z' }));
    expect(old.date).not.toBe('Today');
    expect(old.date).not.toBe('Yesterday');
    expect(old.date).toMatch(/\d/);
  });
});
