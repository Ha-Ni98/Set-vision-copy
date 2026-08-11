-- CreateEnum
CREATE TYPE "RevocationRequestStat" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_REVOCATION_REQUEST_STAT';

-- CreateTable
CREATE TABLE "CardRevocationRequest" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "activationId" TEXT,
    "distributorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "stat" "RevocationRequestStat" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CardRevocationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardRevocationRequest_cardId_stat_idx" ON "CardRevocationRequest"("cardId", "stat");

-- CreateIndex
CREATE INDEX "CardRevocationRequest_distributorId_stat_idx" ON "CardRevocationRequest"("distributorId", "stat");

-- CreateIndex
CREATE INDEX "CardRevocationRequest_stat_idx" ON "CardRevocationRequest"("stat");

-- CreateIndex
CREATE INDEX "CardRevocationRequest_createdAt_idx" ON "CardRevocationRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "CardRevocationRequest" ADD CONSTRAINT "CardRevocationRequest_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRevocationRequest" ADD CONSTRAINT "CardRevocationRequest_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRevocationRequest" ADD CONSTRAINT "CardRevocationRequest_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRevocationRequest" ADD CONSTRAINT "CardRevocationRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
