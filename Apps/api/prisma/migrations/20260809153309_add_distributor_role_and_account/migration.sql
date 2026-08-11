-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogActionType" ADD VALUE 'LINK_USER_ACCOUNT';
ALTER TYPE "LogActionType" ADD VALUE 'UNLINK_USER_ACCOUNT';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DISTRIBUTOR';

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_userId_key" ON "Distributor"("userId");

-- AddForeignKey
ALTER TABLE "Distributor" ADD CONSTRAINT "Distributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

