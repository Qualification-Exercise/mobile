// Pure BigInt-based conversions between human-readable amounts and base units
// (the smallest indivisible unit of a token). No floating point is used so
// 18-decimal tokens keep full precision.

// Convert a human amount string (e.g. "1.5") into a base-unit integer string.
// Fractional digits beyond `decimals` are truncated (they cannot be
// represented). Throws on malformed input.
export function toBaseUnits(human: string, decimals: number): string {
  const trimmed = human.trim();

  if (trimmed === '' || trimmed === '.' || !/^\d*\.?\d*$/.test(trimmed)) {
    throw new Error(`Invalid amount: "${human}"`);
  }

  const [intPart = '', fracRaw = ''] = trimmed.split('.');
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  const combined = `${intPart}${frac}`.replace(/^0+/, '');

  return BigInt(combined === '' ? '0' : combined).toString();
}

// Convert a base-unit integer string back into a trimmed human amount string.
// Throws on non-integer input.
export function fromBaseUnits(base: string, decimals: number): string {
  const value = base.trim();

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid base-unit amount: "${base}"`);
  }

  if (decimals === 0) {
    return value.replace(/^0+/, '') || '0';
  }

  const padded = value.padStart(decimals + 1, '0');
  const intPart = padded.slice(0, padded.length - decimals).replace(/^0+/, '');
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, '');

  return frac ? `${intPart || '0'}.${frac}` : intPart || '0';
}
