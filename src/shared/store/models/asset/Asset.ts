import type { NetworkName } from '../../../../../.wdk';

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  // Machine fields used by transfers (mirror the asset registry).
  network: NetworkName;
  decimals: number;
  isNative: boolean;
  contractAddress?: string;
  // Base-unit balance string is the source of truth once balances come from
  // the WDK hook layer. `balance`/`fiatValue` remain for display for now.
  balanceBaseUnits?: string;
  balance: number;
  fiatValue: number;
};
