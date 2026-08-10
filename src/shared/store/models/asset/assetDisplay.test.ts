import { colors } from '@shared/ui/tokens';
import {
  formatFiat,
  getAssetColor,
  getAssetGlyphColor,
  getAssetIcon,
  getFiatValue,
} from './assetDisplay';

describe('asset glyph/colour lookup', () => {
  it('returns the mapped glyph and colour for a known symbol', () => {
    expect(getAssetIcon({ symbol: 'BTC' })).toBe('₿');
    expect(getAssetColor({ symbol: 'BTC' })).toBe('#F7931A');
    expect(getAssetGlyphColor({ symbol: 'BTC' })).toBe('#1A1200');
  });

  it('falls back to the first letter and neutral colours for unknown symbols', () => {
    expect(getAssetIcon({ symbol: 'XRP' })).toBe('X');
    expect(getAssetColor({ symbol: 'XRP' })).toBe(colors.textSecondary);
    expect(getAssetGlyphColor({ symbol: 'XRP' })).toBe(colors.textPrimary);
  });
});

describe('getFiatValue', () => {
  it('is null when the balance or price is unknown', () => {
    expect(getFiatValue(undefined, 6, 2)).toBeNull();
    expect(getFiatValue('1000000', 6, null)).toBeNull();
  });

  it('multiplies the whole-unit balance by the price', () => {
    expect(getFiatValue('1500000', 6, 2)).toBe(3);
  });
});

describe('formatFiat', () => {
  it('renders a dash for null and a currency string otherwise', () => {
    expect(formatFiat(null)).toBe('—');
    expect(formatFiat(2)).toBe('$2.00');
  });
});
