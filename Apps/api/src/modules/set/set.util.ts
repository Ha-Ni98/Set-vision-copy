import { randomBytes } from 'crypto';

export function generateSetNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `SET-${date}-${suffix}`;
}

export function generateCardKey(): string {
  return randomBytes(6).toString('hex').toUpperCase();
}
