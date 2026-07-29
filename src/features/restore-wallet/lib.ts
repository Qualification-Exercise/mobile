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

const WORD_PATTERN = /^[a-z]+$/i;

export function parsePhraseInput(text: string): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length === 12 ? words : null;
}

export function isPlausiblePhrase(words: string[]): boolean {
  return words.length === 12 && words.every(word => WORD_PATTERN.test(word));
}
