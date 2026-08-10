-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogActionType" ADD VALUE 'SET_SUBSCRIPTION_PLAN_COST';
ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_ACTIVATION_COST';

-- AlterTable
ALTER TABLE "Activation" ADD COLUMN     "activationCost" DECIMAL(12,2) DEFAULT 0;

-- CreateTable
CREATE TABLE "SubscriptionPlanCost" (
    "id" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlanCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanCost_subscriptionPlanId_key" ON "SubscriptionPlanCost"("subscriptionPlanId");

-- AddForeignKey
ALTER TABLE "SubscriptionPlanCost" ADD CONSTRAINT "SubscriptionPlanCost_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
