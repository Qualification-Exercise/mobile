import type { NetworkName } from '../../../.wdk';

// EVM address: `0x` followed by 40 hex characters. Case is not enforced —
// full EIP-55 checksum validation needs keccak256 and is intentionally out of
// scope here, so lowercase and mixed-case addresses both pass.
const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

// Tron base58check address: leading `T`, 34 characters total, drawn from the
// base58 alphabet (no 0, O, I or l).
const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

// Bitcoin L1 bech32/bech32m (SegWit) address, e.g. `bc1q…`. Legacy base58
// addresses (`1…`/`3…`) are not accepted since the wallet derives bech32
// receive addresses.
const BTC_BECH32_RE = /^bc1[023456789acdefghjklmnpqrstuvwxyz]{6,87}$/i;

// Spark addresses are bech32-style with an `sp` prefix (e.g. `sp1…`); `bc1…`
// is also accepted because Spark settles to Bitcoin. Validated loosely as the
// canonical Spark address spec is still being confirmed.
const SPARK_RE = /^(sp1|spark1|bc1)[023456789acdefghjklmnpqrstuvwxyz]{6,120}$/i;

// Networks that use EVM `0x…` addresses.
const EVM_NETWORKS: NetworkName[] = ['ethereum', 'arbitrum', 'polygon'];

// Best-effort, chain-aware format check for a send destination. Returns true
// when `address` is well-formed for `network`. This catches obvious typos
// before an on-chain send; it is not a substitute for the network itself
// rejecting an unusable address.
export function isValidAddress(network: NetworkName, address: string): boolean {
  const value = address.trim();

  if (value === '') {
    return false;
  }

  if (EVM_NETWORKS.includes(network)) {
    return EVM_RE.test(value);
  }

  switch (network) {
    case 'tron':
      return TRON_RE.test(value);
    case 'bitcoin':
      return BTC_BECH32_RE.test(value);
    case 'spark':
      return SPARK_RE.test(value);
    default:
      return false;
  }
}
