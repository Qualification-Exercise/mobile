import { makeAutoObservable, runInAction } from 'mobx';
import {
  couponsApi,
  pricingApi,
  transactionsApi,
  type CreateTransactionDTO,
} from '@shared/api';
import { SUPPORTED_ASSETS, getPriceTicker } from '@shared/config';
import type { Asset } from '../models/asset';
import { sumClaimableUtl, toCoupon, type Coupon } from '../models/coupon';
import { toTransaction, type Transaction } from '../models/transaction';
import type { Wallet } from '../models/wallet';
import { TypedRequest } from '../typedRequest';
import { Logger } from '../../lib/logger';

// Build the wallet's asset list from the asset registry so token metadata has
// a single source of truth. Balances are intentionally left at zero here:
// they are read from `useAssetBalances()` in components, not owned by the
// store. Fiat pricing has no oracle configured, so `fiatValue` stays a
// placeholder (see `totalFiatBalance`).
function buildAssetsFromRegistry(): Asset[] {
  return SUPPORTED_ASSETS.map(config => ({
    id: config.id,
    symbol: config.symbol,
    name: config.name,
    network: config.network,
    decimals: config.decimals,
    isNative: config.isNative,
    contractAddress: config.address ?? undefined,
    balanceBaseUnits: undefined,
    balance: 0,
    fiatValue: 0,
  }));
}

// Assets with no market (UTL) are left out rather than sent and ignored. The
// rest are asked for under the feed's own ticker — see `getPriceTicker`.
const PRICED_TICKERS: string[] = [
  ...new Set(
    SUPPORTED_ASSETS.filter(config => config.symbol !== 'UTL').map(config =>
      getPriceTicker(config.symbol),
    ),
  ),
];

export class WalletStore {
  private readonly logger = new Logger('WalletStore');

  wallet: Wallet = {
    displayName: 'Main Wallet',
  };

  // Static token metadata sourced from the asset registry. Live balances come
  // from `useAssetBalances()` in components, not from these objects.
  assets: Asset[] = buildAssetsFromRegistry();

  // Broadcasts made on this device that the backend has not listed yet. They
  // are merged into `transactions` so a send shows up in history immediately,
  // and drop out as soon as the same hash comes back from the API.
  localTransactions: Transaction[] = [];

  transactionsRequest = new TypedRequest<Transaction[]>(
    async () => {
      const { items } = await transactionsApi.list();
      return items.map(toTransaction);
    },
    {
      initialData: [],
      defaultError: 'Could not load transactions.',
      loadingMessage: 'Loading activity…',
    },
  );

  couponsRequest = new TypedRequest<Coupon[]>(
    async () => {
      const { items } = await couponsApi.list();
      return items.map(toCoupon);
    },
    {
      initialData: [],
      defaultError: 'Could not load coupons.',
      loadingMessage: 'Loading rewards…',
    },
  );

  // Spot price per upper-case ticker, in USD. Missing entries mean the feed
  // has no market for that asset, which keeps it out of the fiat total rather
  // than counting it as zero.
  pricesRequest = new TypedRequest<Map<string, number>>(
    async () => {
      const { data } = await pricingApi.live(PRICED_TICKERS);
      const prices = new Map<string, number>();
      const unpriced: string[] = [];

      for (const entry of data) {
        const price = Number(entry.price);
        if (entry.price != null && Number.isFinite(price)) {
          prices.set(entry.from.toUpperCase(), price);
        } else {
          unpriced.push(entry.from);
        }
      }

      // An asset the feed cannot quote drops out of the fiat total, which is
      // invisible on screen — the total just reads low. Name it instead.
      if (unpriced.length > 0) {
        this.logger.warn('no price for', unpriced.join(', '));
      }
      this.logger.log('prices', Object.fromEntries(prices));

      return prices;
    },
    {
      initialData: new Map(),
      defaultError: 'Could not load prices.',
      loadingMessage: 'Loading prices…',
    },
  );

  // The EVM address the backend has on file, as returned by `GET /wallets`.
  // Payment must originate from exactly this address: the backend identifies
  // the payer by sender address alone, and a mismatch is dropped as `ignored`
  // with no retry. `null` means unknown/unlinked — do not let a payment go.
  linkedEvmAddress: string | null = null;

  // Best-effort backend-report queue: broadcasts whose `POST /transactions`
  // failed. Retried on a later deferred pass. In-memory only — persistence
  // across a full reload is a follow-up.
  pendingReports: CreateTransactionDTO[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  setLinkedEvmAddress(address: string | null) {
    this.linkedEvmAddress = address;
  }

  get prices(): Map<string, number> {
    return this.pricesRequest.data;
  }

  // USD price for one whole unit of `symbol`, or null when the feed has no
  // market for it.
  priceOf(symbol: string): number | null {
    return this.prices.get(getPriceTicker(symbol)) ?? null;
  }

  async loadPrices() {
    await this.pricesRequest.fetch();
  }

  // Server history plus any local broadcast the server has not caught up on.
  get transactions(): Transaction[] {
    const known = new Set(
      this.transactionsRequest.data.map(transaction => transaction.hash),
    );
    return [
      ...this.localTransactions.filter(
        transaction => !known.has(transaction.hash),
      ),
      ...this.transactionsRequest.data,
    ];
  }

  get coupons(): Coupon[] {
    return this.couponsRequest.data;
  }

  // Total claimable cashback, in UTL base units.
  get claimableCashbackTotal(): bigint {
    return sumClaimableUtl(this.coupons);
  }

  get claimableCoupons(): Coupon[] {
    return this.coupons.filter(coupon => coupon.claimable);
  }

  async loadTransactions() {
    await this.transactionsRequest.fetch();
  }

  async loadCoupons() {
    await this.couponsRequest.fetch();
  }

  // Record a real, broadcast transfer in local history. The broadcast itself
  // happens in the transfer hook (`useAssetTransfer.send`); this row is only
  // shown until the backend lists the same hash.
  recordSentTransaction(transaction: Transaction) {
    this.localTransactions.unshift(transaction);
  }

  // Report a broadcast to the backend for confirmation tracking. Best-effort:
  // the funds already moved, so a failure never surfaces to the user — the
  // report is queued and retried later. The `txHash` is the idempotency key,
  // so retries replay safely.
  async reportSend(dto: CreateTransactionDTO) {
    try {
      await transactionsApi.report(dto, dto.txHash);
    } catch (error) {
      this.logger.warn('Transaction report failed; queued for retry', error);
      runInAction(() => {
        this.pendingReports.push(dto);
      });
    }
  }

  // Re-attempt any queued reports (e.g. on the next wallet-ready pass). Each
  // still-failing report is re-queued by `reportSend`.
  async flushPendingReports() {
    if (this.pendingReports.length === 0) {
      return;
    }
    const queued = this.pendingReports.slice();
    runInAction(() => {
      this.pendingReports = [];
    });
    for (const dto of queued) {
      await this.reportSend(dto);
    }
  }
}
