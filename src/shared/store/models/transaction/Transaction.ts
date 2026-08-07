export type TransactionDirection = 'in' | 'out';

export type Transaction = {
  id: string;
  direction: TransactionDirection;
  counterparty: string;
  amount: number;
  date: string;
  assetId: string;
};
