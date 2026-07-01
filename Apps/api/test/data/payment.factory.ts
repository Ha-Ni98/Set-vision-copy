import type { Payment, Admin, Activator } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface SeededPayment {
  payment: Payment;
}

export const seedPayment = async (
  prisma: PrismaClient,
  adminId: string,
  activatorId: string,
  overrides: {
    amount?: number;
    previousCredits?: number;
    paymentDate?: Date;
    isDeleted?: boolean;
    deletedDate?: Date | null;
  } = {},
): Promise<SeededPayment> => {
  const amount = overrides.amount ?? 100;
  const payment = await prisma.payment.create({
    data: {
      adminId,
      activatorId,
      totalAmount: new Prisma.Decimal(amount),
      previousCredits: new Prisma.Decimal(overrides.previousCredits ?? 500),
      ...(overrides.paymentDate !== undefined && { paymentDate: overrides.paymentDate }),
      ...(overrides.isDeleted !== undefined && { isDeleted: overrides.isDeleted }),
      ...(overrides.deletedDate !== undefined && { deletedDate: overrides.deletedDate }),
    },
  });
  return { payment };
};
