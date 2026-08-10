import {
  SUPPORTED_NETWORKS,
  findAssetConfig,
  getAsset,
  getAssetConfig,
  getChainKind,
  getFeeToken,
  getNativeAsset,
  getNativeMaxTransferFee,
  getNetworkLabel,
  getPriceTicker,
  getSrcChainId,
  groupAssetsByNetwork,
} from './assets';

describe('getChainKind / getSrcChainId', () => {
  it('maps every EVM network to the evm family', () => {
    expect(getChainKind('ethereum')).toBe('evm');
    expect(getChainKind('arbitrum')).toBe('evm');
    expect(getChainKind('polygon')).toBe('evm');
  });

  it('maps non-EVM networks to their own family', () => {
    expect(getChainKind('tron')).toBe('tron');
    expect(getChainKind('bitcoin')).toBe('bitcoin');
    expect(getChainKind('spark')).toBe('spark');
  });

  it('returns the real chain id for EVM and the synthetic id otherwise', () => {
    expect(getSrcChainId('ethereum')).toBe(11155111);
    expect(getSrcChainId('arbitrum')).toBe(42161);
    expect(getSrcChainId('polygon')).toBe(137);
    expect(getSrcChainId('tron')).toBe(4294967297);
  });
});

describe('getNetworkLabel', () => {
  it('labels Ethereum as Sepolia so it does not read as mainnet', () => {
    expect(getNetworkLabel('ethereum')).toBe('Ethereum Sepolia');
    expect(getNetworkLabel('arbitrum')).toBe('Arbitrum');
  });
});

describe('getPriceTicker', () => {
  it('rewrites USDT to the feed ticker UST', () => {
    expect(getPriceTicker('USDT')).toBe('UST');
    expect(getPriceTicker('usdt')).toBe('UST');
  });

  it('upper-cases and passes through anything else', () => {
    expect(getPriceTicker('eth')).toBe('ETH');
  });
});

describe('groupAssetsByNetwork', () => {
  it('groups in first-seen order without reordering', () => {
    const grouped = groupAssetsByNetwork([
      { network: 'arbitrum' as const, n: 1 },
      { network: 'tron' as const, n: 2 },
      { network: 'arbitrum' as const, n: 3 },
    ]);
    expect(grouped.map(g => g.network)).toEqual(['arbitrum', 'tron']);
    expect(grouped[0].assets.map(a => a.n)).toEqual([1, 3]);
  });
});

describe('findAssetConfig', () => {
  it('matches an EVM token by chain id and symbol, case-insensitively', () => {
    expect(findAssetConfig('evm', 42161, 'usdt')?.id).toBe('usdt-arbitrum');
  });

  it('ignores the chain id for non-EVM families', () => {
    expect(findAssetConfig('bitcoin', undefined, 'BTC')?.id).toBe(
      'btc-bitcoin',
    );
  });

  it('returns undefined when nothing matches', () => {
    expect(findAssetConfig('evm', 999, 'USDT')).toBeUndefined();
  });
});

describe('getNativeAsset / getNativeMaxTransferFee', () => {
  it('returns the gas coin of a network', () => {
    expect(getNativeAsset('arbitrum')?.id).toBe('eth-arbitrum');
    expect(getNativeAsset('polygon')?.symbol).toBe('POL');
  });

  it('caps native fees on EVM chains and leaves others uncapped', () => {
    expect(getNativeMaxTransferFee('ethereum')).toBe(10_000_000_000_000_000n);
    expect(getNativeMaxTransferFee('tron')).toBeUndefined();
  });
});

describe('getAssetConfig / getAsset', () => {
  it('looks a config up by id', () => {
    expect(getAssetConfig('usdt-arbitrum')?.symbol).toBe('USDT');
    expect(getAssetConfig('nope')).toBeUndefined();
  });

  it('builds a BaseAsset for a known id and undefined otherwise', () => {
    expect(getAsset('usdt-arbitrum')).toBeDefined();
    expect(getAsset('nope')).toBeUndefined();
  });
});

describe('getFeeToken', () => {
  it('bills a native asset in its own coin', () => {
    const eth = getAssetConfig('eth-arbitrum')!;
    expect(getFeeToken(eth)).toEqual({ decimals: 18, symbol: 'ETH' });
  });

  it('routes EVM token transfers through the USDT paymaster by default', () => {
    const usdt = getAssetConfig('usdt-arbitrum')!;
    expect(getFeeToken(usdt)).toEqual({ decimals: 6, symbol: 'USDT' });
  });

  it('bills a token in the gas coin when native gas is chosen', () => {
    const usdt = getAssetConfig('usdt-arbitrum')!;
    expect(getFeeToken(usdt, 'native')).toEqual({
      decimals: 18,
      symbol: 'ETH',
    });
  });

  it('burns TRX for Tron token transfers', () => {
    const usdtTron = getAssetConfig('usdt-tron')!;
    expect(getFeeToken(usdtTron)).toEqual({ decimals: 6, symbol: 'TRX' });
  });
});

describe('SUPPORTED_NETWORKS', () => {
  it('is the de-duplicated set of every asset network', () => {
    expect(SUPPORTED_NETWORKS).toEqual([
      'bitcoin',
      'spark',
      'ethereum',
      'arbitrum',
      'polygon',
      'tron',
    ]);
  });
});
