import type { PrismaClient } from '@prisma/client';
import { ForbiddenError } from '@common/errors';

export type DistributorScope = { id: string; storeName: string; isEnabled: boolean };

/** Resolves the signed-in principal to their own Distributor row. THE single translation from
 *  User.id to Distributor.id for every scoped read in the distributor portal. Throws
 *  ForbiddenError when the principal has no live distributor profile — a DISTRIBUTOR-role user
 *  with a deleted profile is a broken state, not a 404. */
export async function resolveDistributorScope(
  prisma: PrismaClient,
  userId: string,
): Promise<DistributorScope> {
  const distributor = await prisma.distributor.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, storeName: true, isEnabled: true },
  });
  if (!distributor) throw new ForbiddenError();
  return distributor;
}
