import { randomBytes } from 'crypto';

export function generateLotNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `LOT-${date}-${suffix}`;
}
