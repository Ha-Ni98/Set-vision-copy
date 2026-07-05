// Client-side card-key generator (Stage-04-fix) — mirrors the server's format exactly:
// 12 uppercase hex characters (6 random bytes), matching CARD_KEY_PATTERN in the contract
// and the API's randomBytes(6).toString('hex').toUpperCase(). Used to seed the editable key
// list when creating a set; the server still re-validates format and uniqueness.
export function generateCardKey(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
