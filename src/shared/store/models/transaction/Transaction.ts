import type { NetworkName } from '../../../../../.wdk';

export type TransactionDirection = 'in' | 'out';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export type Transaction = {
  id: string;
  direction: TransactionDirection;
  counterparty: string;
  amount: number;
  date: string;
  assetId: string;
  // On-chain fields, present for real (broadcast) transfers.
  hash?: string;
  status?: TransactionStatus;
  feeBaseUnits?: string;
  network?: NetworkName;
  timestamp?: number;
};
