import type { TransactionDTO } from '@shared/api';
import { findAssetConfig } from '@shared/config';

export type TransactionDirection = 'in' | 'out';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export type Transaction = {
  id: string;
  direction: TransactionDirection;
  // The other side of the transfer, already shortened for display.
  counterparty: string;
  // Amount in the token's smallest unit, unsigned. `direction` carries the
  // sign so no precision is lost on 18-decimal tokens.
  amountBaseUnits: string;
  decimals: number;
  symbol: string;
  date: string;
  // Registry asset id, or null when the row's token is not in the registry.
  assetId: string | null;
  hash: string;
  status: TransactionStatus;
  confirmations: number | null;
  requiredConfirmations: number;
};

// Shorten an address for a history row, e.g. `0x91c2…f2De`.
export function shortenAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Calendar-relative day label. Anything older than yesterday shows its date,
// which is what the history rows have always displayed.
function formatDate(iso: string): string {
  const at = new Date(iso);
  const days = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
      86400000,
  );
  if (days <= 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  return at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STATUSES: Record<string, TransactionStatus> = {
  pending: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
};

export function toTransaction(dto: TransactionDTO): Transaction {
  const config = findAssetConfig(dto.chain, dto.srcChainId, dto.token);

  return {
    id: dto.id,
    direction: dto.direction,
    counterparty: shortenAddress(dto.direction === 'in' ? dto.from : dto.to),
    amountBaseUnits: dto.amount,
    // Unknown tokens still list; they just show their raw symbol and, without
    // registry metadata, their smallest-unit amount.
    decimals: config?.decimals ?? 0,
    symbol: config?.symbol ?? dto.token.toUpperCase(),
    date: formatDate(dto.at),
    assetId: config?.id ?? null,
    hash: dto.txHash,
    status: STATUSES[dto.status] ?? 'pending',
    confirmations: dto.confirmations,
    requiredConfirmations: dto.requiredConfirmations,
  };
}
