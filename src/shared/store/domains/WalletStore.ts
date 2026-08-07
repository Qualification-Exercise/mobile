import { makeAutoObservable, runInAction } from 'mobx';
import type { NetworkName } from '../../../../.wdk';
import { SUPPORTED_ASSETS } from '@shared/config';
import { transactionsApi, type CreateTransactionDTO } from '@shared/api';
import type { Asset } from '../models/asset';
import type { Coupon } from '../models/coupon';
import type { Transaction } from '../models/transaction';
import type { Wallet } from '../models/wallet';

const CASHBACK_RATE = 0.05;

// UTL is the cashback payout token (Ethereum). Kept as a named const so the
// coupon flow references the registry id rather than a magic string.
const UTL_ASSET_ID = 'utl-ethereum';

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

function randomSegment(length: number): string {
  return Math.random()
    .toString(36)
    .slice(2)
    .toUpperCase()
    .padEnd(length, '0')
    .slice(0, length);
}

function generateCouponCode(): string {
  return `WDK-${randomSegment(4)}-${randomSegment(2)}`;
}

export class WalletStore {
  wallet: Wallet = {
    address: '0xA4f2…c9c2E',
    displayName: 'Main Wallet',
  };

  // Static token metadata sourced from the asset registry. Live balances come
  // from `useAssetBalances()` in components, not from these objects.
  assets: Asset[] = buildAssetsFromRegistry();

  transactions: Transaction[] = [
    {
      id: 'txn-1',
      direction: 'in',
      counterparty: 'From 0x91c…2De',
      amount: 250.0,
      date: 'Today',
      assetId: 'usdt-arbitrum',
    },
    {
      id: 'txn-2',
      direction: 'out',
      counterparty: 'Café Nero — Milan',
      amount: -25.0,
      date: 'Today',
      assetId: 'usdt-arbitrum',
    },
    {
      id: 'txn-3',
      direction: 'in',
      counterparty: 'Bridge · Polygon',
      amount: 500.0,
      date: 'Yesterday',
      assetId: 'usdt-arbitrum',
    },
    {
      id: 'txn-4',
      direction: 'out',
      counterparty: 'To 0x33a…9b1',
      amount: -40.0,
      date: 'Mar 12',
      assetId: 'usdt-arbitrum',
    },
    {
      id: 'txn-5',
      direction: 'in',
      counterparty: 'From 0xd21…77c',
      amount: 120.0,
      date: 'Mar 09',
      assetId: 'usdt-arbitrum',
    },
  ];

  coupons: Coupon[] = [
    {
      code: 'WDK-5F2A-9K',
      merchant: 'Café Nero — Milan',
      amount: 1.25,
      status: 'Claimable',
    },
    {
      code: 'WDK-2C8B-7X',
      merchant: 'GreenMart',
      amount: 1.75,
      status: 'Claimable',
    },
    {
      code: 'WDK-9A1D-3P',
      merchant: 'Bar Torino',
      amount: 0.75,
      status: 'Claimable',
    },
    {
      code: 'WDK-4E6F-1M',
      merchant: 'Metro Kiosk',
      amount: 2.0,
      status: 'Claimed',
    },
  ];

  // Whether this session has already linked the wallet's derived addresses to
  // the backend, so linking isn't re-posted on every READY transition.
  addressesLinked = false;

  // Best-effort backend-report queue: broadcasts whose `POST /transactions`
  // failed. Retried on a later deferred pass. In-memory only — persistence
  // across a full reload is a follow-up.
  pendingReports: CreateTransactionDTO[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  markAddressesLinked() {
    this.addressesLinked = true;
  }

  // Fiat pricing is out of scope: no price oracle is configured, so per-asset
  // `fiatValue` is a placeholder (0) and this total is not a real figure.
  // Components should treat fiat as unavailable until an oracle is wired in.
  get totalFiatBalance(): number {
    return this.assets.reduce((sum, asset) => sum + asset.fiatValue, 0);
  }

  get claimableCashbackTotal(): number {
    return this.coupons
      .filter(coupon => coupon.status === 'Claimable')
      .reduce((sum, coupon) => sum + coupon.amount, 0);
  }

  // Record a real, broadcast transfer in local history. The broadcast itself
  // happens in the transfer hook (`useAssetTransfer.send`); the store only
  // keeps the history row, seeded `pending` until confirmation tracking
  // updates it.
  recordSentTransaction(params: {
    assetId: string;
    amount: number;
    destination: string;
    hash: string;
    feeBaseUnits?: string;
    network: NetworkName;
    timestamp: number;
  }) {
    const {
      assetId,
      amount,
      destination,
      hash,
      feeBaseUnits,
      network,
      timestamp,
    } = params;

    this.transactions.unshift({
      id: `txn-${this.transactions.length + 1}`,
      direction: 'out',
      counterparty: `To ${destination}`,
      amount: -amount,
      date: 'Today',
      assetId,
      hash,
      status: 'pending',
      feeBaseUnits,
      network,
      timestamp,
    });
  }

  // Report a broadcast to the backend for confirmation tracking. Best-effort:
  // the funds already moved, so a failure never surfaces to the user — the
  // report is queued and retried later. The `txHash` is the idempotency key,
  // so retries replay safely.
  async reportSend(dto: CreateTransactionDTO) {
    try {
      await transactionsApi.report(dto, dto.txHash);
    } catch (error) {
      console.warn('Transaction report failed; queued for retry', error);
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

  recordScanToPayment(merchant: string, amount: number, assetId: string) {
    this.transactions.unshift({
      id: `txn-${this.transactions.length + 1}`,
      direction: 'out',
      counterparty: merchant,
      amount: -amount,
      date: 'Today',
      assetId,
    });

    this.coupons.unshift({
      code: generateCouponCode(),
      merchant,
      amount: Number((amount * CASHBACK_RATE).toFixed(2)),
      status: 'Claimable',
    });
  }

  claimCoupon(code: string) {
    const coupon = this.coupons.find(c => c.code === code);
    if (!coupon || coupon.status === 'Claimed') {
      return;
    }

    coupon.status = 'Claimed';

    const utl = this.assets.find(asset => asset.id === UTL_ASSET_ID);
    if (utl) {
      utl.balance += coupon.amount;
      utl.fiatValue += coupon.amount;
    }
  }
}
