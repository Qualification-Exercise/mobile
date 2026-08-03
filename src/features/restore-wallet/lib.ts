export const MOCK_SCANNED_PHRASE = [
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

export function parsePhraseInput(text: string): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length === 12 ? words : null;
}
