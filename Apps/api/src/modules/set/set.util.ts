import { randomBytes } from 'crypto';

export function generateSetNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `SET-${date}-${suffix}`;
}

// 8 chars over the full A-Z0-9 alphabet (36 symbols) — matches CARD_KEY_PATTERN in the
// contract. A plain byte % 36 has a slight modulo bias (256 doesn't divide evenly by 36), an
// accepted trade-off here since this is a non-cryptographic serial, not a secret.
const CARD_KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CARD_KEY_LENGTH = 8;

export function generateCardKey(): string {
  const bytes = randomBytes(CARD_KEY_LENGTH);
  return Array.from(bytes, (b) => CARD_KEY_ALPHABET[b % CARD_KEY_ALPHABET.length]).join('');
}
