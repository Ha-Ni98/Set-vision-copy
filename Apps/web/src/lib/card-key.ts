// Client-side card-key generator (Stage-04-fix) — mirrors the server's format exactly:
// 8 characters over the full A-Z0-9 alphabet (8 random bytes, one per character), matching
// CARD_KEY_PATTERN in the contract and the API's own generator in set.util.ts. Used to seed
// the editable key list when creating a set; the server still re-validates format and
// uniqueness. A plain byte % 36 has a slight modulo bias (256 doesn't divide evenly by 36),
// an accepted trade-off here since this is a non-cryptographic serial, not a secret.
const CARD_KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CARD_KEY_LENGTH = 8;

export function generateCardKey(): string {
  const bytes = new Uint8Array(CARD_KEY_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CARD_KEY_ALPHABET[b % CARD_KEY_ALPHABET.length]).join("");
}
