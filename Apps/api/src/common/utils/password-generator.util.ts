import crypto from 'node:crypto';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

// Cryptographically random password guaranteeing ≥1 char from each class.
export const generateTempPassword = (length = 14): string => {
  if (length < 4) throw new RangeError('length must be ≥ 4');

  const pick = (charset: string): string =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    charset[crypto.randomInt(charset.length)]!;

  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: length - 4 }, () => pick(ALL));

  const chars = [...required, ...rest];

  // Fisher-Yates shuffle using crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join('');
};
