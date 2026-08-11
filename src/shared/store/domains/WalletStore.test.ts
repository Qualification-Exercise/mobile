import { couponsApi, pricingApi, transactionsApi } from '@shared/api';
import { SUPPORTED_ASSETS } from '@shared/config';
import type { CouponDTO, TransactionDTO } from '@shared/api';
import { WalletStore } from './WalletStore';

jest.mock('@shared/api', () => ({
  couponsApi: { list: jest.fn() },
  pricingApi: { live: jest.fn() },
  transactionsApi: { list: jest.fn(), report: jest.fn() },
}));

const listTransactions = transactionsApi.list as jest.Mock;
const reportTransaction = transactionsApi.report as jest.Mock;
const listCoupons = couponsApi.list as jest.Mock;
const livePricing = pricingApi.live as jest.Mock;

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

function txDto(overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: 'tx',
    type: 'transfer',
    chain: 'evm',
    srcChainId: 42161,
    txHash: '0xserver',
    outputIndex: 0,
    direction: 'in',
    token: 'USDT',
    amount: '1000000',
    usdValue: null,
    from: '0xfrom',
    to: '0xto',
    fee: null,
    status: 'confirmed',
    failureReason: null,
    confirmations: 1,
    requiredConfirmations: 6,
    claimId: null,
    source: 'indexer',
    at: new Date().toISOString(),
    ...overrides,
  };
}

function couponDto(overrides: Partial<CouponDTO> = {}): CouponDTO {
  return {
    id: 'c',
    code: 'CODE',
    status: 'ISSUED',
    paymentRef: 'ref',
    utlAmount: '1000000000000000000',
    expiresAt: null,
    claimable: false,
    sourcePayment: null,
    ...overrides,
  };
}

describe('WalletStore assets', () => {
  it('builds the asset list from the registry with zeroed balances', () => {
    const store = new WalletStore();
    expect(store.assets).toHaveLength(SUPPORTED_ASSETS.length);
    expect(store.assets.every(a => a.balance === 0)).toBe(true);
  });
});

describe('transactions', () => {
  it('shows local broadcasts first and drops ones the server now lists', async () => {
    listTransactions.mockResolvedValue({
      items: [txDto({ id: 's1', txHash: '0xserver' })],
    });
    const store = new WalletStore();
    await store.loadTransactions();

    // A genuinely new local send, then a local row the server has caught up on.
    store.recordSentTransaction({ hash: '0xlocal' } as any);
    store.recordSentTransaction({ hash: '0xserver' } as any);

    expect(store.transactions.map(t => t.hash)).toEqual([
      '0xlocal',
      '0xserver',
    ]);
  });
});

describe('coupons', () => {
  it('separates claimable coupons and totals their cashback', async () => {
    listCoupons.mockResolvedValue({
      items: [
        couponDto({
          id: 'a',
          claimable: true,
          utlAmount: '1000000000000000000',
        }),
        couponDto({
          id: 'b',
          claimable: false,
          utlAmount: '5000000000000000000',
        }),
      ],
    });
    const store = new WalletStore();
    await store.loadCoupons();

    expect(store.claimableCoupons).toHaveLength(1);
    expect(store.claimableCashbackTotal).toBe(1_000_000_000_000_000_000n);
  });
});

describe('prices', () => {
  it('resolves a price by its feed ticker, or null when unquoted', async () => {
    livePricing.mockResolvedValue({
      data: [
        { from: 'BTC', to: 'USD', price: 100 },
        { from: 'UST', to: 'USD', price: 1 },
        // An asset the feed cannot quote is dropped, not counted as zero.
        { from: 'POL', to: 'USD', price: null },
      ],
    });
    const store = new WalletStore();
    await store.loadPrices();

    expect(store.priceOf('BTC')).toBe(100);
    expect(store.priceOf('USDT')).toBe(1);
    expect(store.priceOf('POL')).toBeNull();
    expect(store.priceOf('DOGE')).toBeNull();
  });
});

describe('reportSend / flushPendingReports', () => {
  const dto = {
    chain: 'evm' as const,
    srcChainId: 42161,
    txHash: '0xhash',
    direction: 'out' as const,
    token: 'USDT',
    amount: '1000000',
    from: '0xfrom',
    to: '0xto',
  };

  it('queues a failed report and drains it on flush', async () => {
    const store = new WalletStore();

    reportTransaction.mockRejectedValueOnce(new Error('offline'));
    await store.reportSend(dto);
    expect(store.pendingReports).toHaveLength(1);

    reportTransaction.mockResolvedValueOnce(undefined);
    await store.flushPendingReports();
    expect(store.pendingReports).toHaveLength(0);
  });

  it('does not queue a successful report', async () => {
    const store = new WalletStore();
    reportTransaction.mockResolvedValueOnce(undefined);
    await store.reportSend(dto);
    expect(store.pendingReports).toHaveLength(0);
  });

  it('flushing an empty queue is a no-op', async () => {
    const store = new WalletStore();
    await store.flushPendingReports();
    expect(reportTransaction).not.toHaveBeenCalled();
  });
});
