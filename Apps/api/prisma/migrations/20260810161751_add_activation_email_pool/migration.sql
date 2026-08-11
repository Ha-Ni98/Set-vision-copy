-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogActionType" ADD VALUE 'ADD_ACTIVATION_EMAIL';
ALTER TYPE "LogActionType" ADD VALUE 'DELETE_ACTIVATION_EMAIL';

-- CreateTable
CREATE TABLE "ActivationEmail" (
    "id" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nbOfActivation" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ActivationEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivationEmail_subscriptionPlanId_isDeleted_lastUsedAt_idx" ON "ActivationEmail"("subscriptionPlanId", "isDeleted", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationEmail_subscriptionPlanId_email_key" ON "ActivationEmail"("subscriptionPlanId", "email");

-- AddForeignKey
ALTER TABLE "ActivationEmail" ADD CONSTRAINT "ActivationEmail_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
