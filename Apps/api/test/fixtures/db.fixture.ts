import { prisma } from '../../src/common/db/prisma';

export const resetDatabase = async (): Promise<void> => {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('resetDatabase blocked outside NODE_ENV=test');
  }
  // Truncate in dependency order (children before parents)
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "WrongInformation", "AdditionalInformation", "ActivationStep",
      "ActivationInformation", "Activation", "Card",
      "OrderLot", "Order", "Lot", "Set",
      "Payment", "Log", "RefreshToken",
      "Activator", "Admin",
      "SubscriptionPlanCommission", "CommissionDuration", "SubscriptionPlan",
      "Distributor", "DeliveryCompany",
      "Commune", "Wilaya",
      "User"
    RESTART IDENTITY CASCADE
  `);
};
