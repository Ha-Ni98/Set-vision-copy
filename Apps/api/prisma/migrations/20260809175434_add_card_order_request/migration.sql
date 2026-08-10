-- CreateEnum
CREATE TYPE "OrderRequestStat" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING_DELIVERY', 'IN_DELIVERY', 'DELIVERED', 'RETURNED');

-- AlterEnum
ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_ORDER_REQUEST_STAT';

-- CreateTable
CREATE TABLE "CardOrderRequest" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "nbOfCards" INTEGER NOT NULL,
    "note" TEXT,
    "stat" "OrderRequestStat" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedByUserId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CardOrderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardOrderRequest_orderId_key" ON "CardOrderRequest"("orderId");

-- CreateIndex
CREATE INDEX "CardOrderRequest_distributorId_stat_idx" ON "CardOrderRequest"("distributorId", "stat");

-- CreateIndex
CREATE INDEX "CardOrderRequest_stat_idx" ON "CardOrderRequest"("stat");

-- CreateIndex
CREATE INDEX "CardOrderRequest_createdAt_idx" ON "CardOrderRequest"("createdAt");

-- CreateIndex
CREATE INDEX "CardOrderRequest_subscriptionPlanId_idx" ON "CardOrderRequest"("subscriptionPlanId");

-- AddForeignKey
ALTER TABLE "CardOrderRequest" ADD CONSTRAINT "CardOrderRequest_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOrderRequest" ADD CONSTRAINT "CardOrderRequest_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOrderRequest" ADD CONSTRAINT "CardOrderRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOrderRequest" ADD CONSTRAINT "CardOrderRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
