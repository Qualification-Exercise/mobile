import { makeAutoObservable } from 'mobx';
import type { Asset } from '@entities/asset';
import type { Coupon } from '@entities/coupon';
import type { Transaction } from '@entities/transaction';
import type { Wallet } from '@entities/wallet';

const CASHBACK_RATE = 0.05;

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

function mockAddressFromPhrase(words: string[]): string {
  let hash = 0;
  for (const char of words.join(' ')) {
    hash = (hash * 31 + char.charCodeAt(0)) % 0xffffffff;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return `0x${hex.slice(0, 4)}…${hex.slice(4, 8)}`;
}

export class WalletStore {
  wallet: Wallet = {
    address: '0xA4f2…c9c2E',
    displayName: 'Main Wallet',
  };

  seedPhrase: string[] = [
    'ridge',
    'salmon',
    'velvet',
    'orbit',
    'cluster',
    'amber',
    'pigeon',
    'trophy',
    'decade',
    'fabric',
    'wisdom',
    'glance',
  ];

  assets: Asset[] = [
    {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      network: 'Mainnet · Spark',
      balance: 0.0312,
      fiatValue: 2047.1,
    },
    {
      id: 'usdt-arbitrum',
      symbol: 'USDt',
      name: 'Tether USDt',
      network: 'Arbitrum',
      balance: 1540.0,
      fiatValue: 1540.0,
    },
    {
      id: 'usdt-tron',
      symbol: 'USDt',
      name: 'Tether USDt',
      network: 'Tron',
      balance: 480.0,
      fiatValue: 480.0,
    },
    {
      id: 'utl',
      symbol: 'UTL',
      name: 'Utility Token',
      network: 'UTL · Ethereum',
      balance: 115.45,
      fiatValue: 115.45,
    },
  ];

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

  constructor() {
    makeAutoObservable(this);
  }

  get totalFiatBalance(): number {
    return this.assets.reduce((sum, asset) => sum + asset.fiatValue, 0);
  }

  get claimableCashbackTotal(): number {
    return this.coupons
      .filter(coupon => coupon.status === 'Claimable')
      .reduce((sum, coupon) => sum + coupon.amount, 0);
  }

  restoreWallet(words: string[]) {
    this.seedPhrase = words;
    this.wallet = {
      ...this.wallet,
      address: mockAddressFromPhrase(words),
    };
  }

  sendAsset(assetId: string, amount: number, destination: string) {
    this.transactions.unshift({
      id: `txn-${this.transactions.length + 1}`,
      direction: 'out',
      counterparty: `To ${destination}`,
      amount: -amount,
      date: 'Today',
      assetId,
    });
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

    const utl = this.assets.find(asset => asset.id === 'utl');
    if (utl) {
      utl.balance += coupon.amount;
      utl.fiatValue += coupon.amount;
    }
  }
}
