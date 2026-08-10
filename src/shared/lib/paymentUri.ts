import {
  SUPPORTED_ASSETS,
  getAssetConfig,
  getChainKind,
  getSrcChainId,
} from '@shared/config';
import { isValidAddress } from './address';
import { toBaseUnits } from './units';

// What a scanned QR resolves to: a transfer this wallet can actually sign.
export type PaymentRequest = {
  assetId: string;
  destination: string;
  // Base units, or null when the QR names a recipient but no amount (the user
  // types it themselves).
  amountBaseUnits: string | null;
};

// Understood QR payloads:
//
//   0xA4f2…                                          plain address
//   ethereum:0xA4f2…                                 EIP-681, native/default
//   ethereum:0xA4f2…@42161?value=1000000             EIP-681 with an amount
//   ethereum:0xTOKEN@42161/transfer?address=0xA4f2…&uint256=25000000
//                                                    EIP-681 ERC-20 transfer
//   bitcoin:bc1q…?amount=0.001                       BIP-21
//
// `defaultAssetId` decides the asset when the payload carries no chain or
// token of its own (a bare address is just an address).
export function parsePaymentRequest(
  raw: string,
  defaultAssetId: string,
): PaymentRequest | null {
  const value = raw.trim();
  if (value === '') {
    return null;
  }

  const schemeEnd = value.indexOf(':');
  if (schemeEnd === -1) {
    return plainAddress(value, defaultAssetId);
  }

  const scheme = value.slice(0, schemeEnd).toLowerCase();
  const rest = value.slice(schemeEnd + 1);

  if (scheme === 'bitcoin') {
    return bip21(rest);
  }
  return eip681(scheme, rest, defaultAssetId);
}

function plainAddress(
  address: string,
  defaultAssetId: string,
): PaymentRequest | null {
  const config = getAssetConfig(defaultAssetId);
  if (!config || !isValidAddress(config.network, address)) {
    return null;
  }
  return { assetId: config.id, destination: address, amountBaseUnits: null };
}

// Split `<target>[@<chainId>][/<function>][?<query>]` into its parts.
function splitTarget(rest: string) {
  const [beforeQuery, query = ''] = rest.split('?', 2);
  const [beforeFn, functionName] = beforeQuery.split('/', 2);
  const [target, chainId] = beforeFn.split('@', 2);
  return {
    target,
    chainId: chainId ? Number(chainId) : undefined,
    functionName,
    params: parseQuery(query),
  };
}

function parseQuery(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (pair === '') {
      continue;
    }
    const [key, encoded = ''] = pair.split('=', 2);
    params[decodeURIComponent(key)] = decodeURIComponent(encoded);
  }
  return params;
}

function eip681(
  scheme: string,
  rest: string,
  defaultAssetId: string,
): PaymentRequest | null {
  const { target, chainId, functionName, params } = splitTarget(rest);

  // An ERC-20 transfer names the token as its target and the recipient in
  // `address`; anything else pays the target directly.
  const isTransfer = functionName === 'transfer';
  const destination = isTransfer ? params.address ?? '' : target;

  // Without a `/transfer` call the URI asks for the chain's native coin, not
  // a token — which is what `findNative` resolves.
  const config = isTransfer
    ? findByContract(target, chainId)
    : findNative(scheme, chainId, defaultAssetId);

  if (!config || !isValidAddress(config.network, destination)) {
    return null;
  }

  // EIP-681 amounts (`uint256`, `value`) are already in base units.
  const amount = params.uint256 ?? params.value ?? null;
  if (amount != null && !/^\d+$/.test(amount)) {
    return null;
  }

  return { assetId: config.id, destination, amountBaseUnits: amount };
}

function findByContract(contract: string, chainId: number | undefined) {
  const wanted = contract.toLowerCase();
  return SUPPORTED_ASSETS.find(
    config =>
      getChainKind(config.network) === 'evm' &&
      config.address?.toLowerCase() === wanted &&
      (chainId === undefined || getSrcChainId(config.network) === chainId),
  );
}

// The gas coin of the chain the payload names, falling back to the default
// asset's chain when the payload names none.
function findNative(
  scheme: string,
  chainId: number | undefined,
  defaultAssetId: string,
) {
  // A chain id only identifies an EVM chain here: EIP-681 has no meaning on
  // the others, whose ids exist purely for the backend.
  const matches = (network: string) =>
    chainId !== undefined
      ? getChainKind(network as never) === 'evm' &&
        getSrcChainId(network as never) === chainId
      : network === scheme;

  const onChain = SUPPORTED_ASSETS.find(
    config => config.isNative && matches(config.network),
  );
  if (onChain) {
    return onChain;
  }

  // An unrecognised chain still resolves when the scheme matches the default
  // asset's own network, which is the bare-address case with a scheme on it.
  const fallback = getAssetConfig(defaultAssetId);
  return fallback && fallback.network === scheme ? fallback : null;
}

function bip21(rest: string): PaymentRequest | null {
  const [address, query = ''] = rest.split('?', 2);
  const config = getAssetConfig('btc-bitcoin');
  if (!config || !isValidAddress('bitcoin', address)) {
    return null;
  }

  // BIP-21 amounts are decimal BTC, unlike EIP-681's base units.
  const amount = parseQuery(query).amount;
  if (amount == null) {
    return { assetId: config.id, destination: address, amountBaseUnits: null };
  }
  try {
    return {
      assetId: config.id,
      destination: address,
      amountBaseUnits: toBaseUnits(amount, config.decimals),
    };
  } catch {
    return null;
  }
}

// The payload this wallet puts in its own receive QR: an EIP-681 ERC-20
// transfer for tokens, a bare address for native coins, so other wallets can
// read it.
export function buildPaymentUri(assetId: string, address: string): string {
  const config = getAssetConfig(assetId);
  if (!config) {
    return address;
  }

  if (getChainKind(config.network) !== 'evm') {
    // Non-EVM chains have no EIP-681 form; a bare address is what their
    // wallets read.
    return address;
  }
  const chainId = getSrcChainId(config.network);
  if (config.isNative) {
    return `ethereum:${address}@${chainId}`;
  }
  return `ethereum:${config.address}@${chainId}/transfer?address=${address}`;
}
