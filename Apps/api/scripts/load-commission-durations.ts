/**
 * load_commission_durations — loads the 5 fixed commission-duration tiers used to price an
 * activation by how long it took (0-10 min, 10-20 min, 20-30 min, 30-60 min, 60+ min).
 *
 * Idempotent: uses upsert keyed on the unique `key`, so it can be re-run safely.
 *
 * Run: npm run load_commission_durations
 */
import { prisma } from '../src/common/db/prisma';

interface DurationTier {
  key: string;
  label: string;
  nbMinuteMin: number;
  nbMinuteMax: number | null;
}

const TIERS: DurationTier[] = [
  { key: '0_10', label: '0-10 min', nbMinuteMin: 0, nbMinuteMax: 10 },
  { key: '10_20', label: '10-20 min', nbMinuteMin: 10, nbMinuteMax: 20 },
  { key: '20_30', label: '20-30 min', nbMinuteMin: 20, nbMinuteMax: 30 },
  { key: '30_60', label: '30-60 min', nbMinuteMin: 30, nbMinuteMax: 60 },
  { key: '60_plus', label: '60+ min', nbMinuteMin: 60, nbMinuteMax: null },
];

async function main(): Promise<void> {
  for (const t of TIERS) {
    await prisma.commissionDuration.upsert({
      where: { key: t.key },
      update: { label: t.label, nbMinuteMin: t.nbMinuteMin, nbMinuteMax: t.nbMinuteMax },
      create: t,
    });
  }

  console.log(`✓ Loaded ${TIERS.length} commission durations.`);
}

main()
  .catch((err) => {
    console.error('✗ load_commission_durations failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
