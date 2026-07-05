/**
 * load_wilaya — loads wilayas and their communes from
 * src/assets/wilayas-with-municipalities.json into the database.
 *
 * Idempotent: uses upsert keyed on the unique codes, so it can be re-run safely.
 *
 * Run: npm run load_wilaya
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { prisma } from '../src/common/db/prisma';

interface RawCommune {
  id: number;
  nameFr: string;
  nameAr: string;
}

interface RawWilaya {
  wilayaCode: number;
  nameFr: string;
  nameAr: string;
  communes: RawCommune[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '../src/assets/wilayas-with-municipalities.json');

// wilayaCode 1 -> "01"; commune codes are made globally unique by prefixing the
// wilaya code, because the raw commune `id` restarts at 1 within each wilaya.
const wilayaCodeOf = (code: number): string => String(code).padStart(2, '0');
const communeCodeOf = (wilayaCode: number, communeId: number): string =>
  `${wilayaCodeOf(wilayaCode)}-${String(communeId).padStart(3, '0')}`;

async function main(): Promise<void> {
  const raw = readFileSync(JSON_PATH, 'utf-8');
  const wilayas = JSON.parse(raw) as RawWilaya[];

  let wilayaCount = 0;
  let communeCount = 0;

  for (const w of wilayas) {
    const wilayaCode = wilayaCodeOf(w.wilayaCode);

    const wilaya = await prisma.wilaya.upsert({
      where: { wilayaCode },
      update: { frName: w.nameFr, arName: w.nameAr },
      create: { wilayaCode, frName: w.nameFr, arName: w.nameAr },
    });
    wilayaCount += 1;

    await Promise.all(
      w.communes.map((c) => {
        const communeCode = communeCodeOf(w.wilayaCode, c.id);
        return prisma.commune.upsert({
          where: { communeCode },
          update: { frName: c.nameFr, arName: c.nameAr, wilayaId: wilaya.id },
          create: {
            communeCode,
            wilayaId: wilaya.id,
            frName: c.nameFr,
            arName: c.nameAr,
          },
        });
      }),
    );
    communeCount += w.communes.length;
  }

  console.log(`✓ Loaded ${wilayaCount} wilayas and ${communeCount} communes.`);
}

main()
  .catch((err) => {
    console.error('✗ load_wilaya failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
