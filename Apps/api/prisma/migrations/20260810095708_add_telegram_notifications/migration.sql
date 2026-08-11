-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStat" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TELEGRAM_LINKED', 'ACTIVATION_CREATED', 'ACTIVATION_INFORMATION_UPDATED', 'ACTIVATION_OTP_RECEIVED', 'ACTIVATION_STATUS_CHANGED', 'ACTIVATION_FROZEN', 'ORDER_REQUEST_CREATED', 'REVOCATION_REQUEST_CREATED', 'ORDER_CREATED', 'REVOCATION_APPROVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogActionType" ADD VALUE 'GENERATE_TELEGRAM_TOKEN';
ALTER TYPE "LogActionType" ADD VALUE 'UNLINK_TELEGRAM';

-- AlterTable
ALTER TABLE "Activator" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkToken" TEXT,
ADD COLUMN     "telegramLinkedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkToken" TEXT,
ADD COLUMN     "telegramLinkedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkToken" TEXT,
ADD COLUMN     "telegramLinkedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "stat" "NotificationStat" NOT NULL DEFAULT 'PENDING',
    "recipientRole" "UserRole" NOT NULL,
    "recipientProfileId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_stat_idx" ON "Notification"("stat");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientRole_recipientProfileId_idx" ON "Notification"("recipientRole", "recipientProfileId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Activator_telegramLinkToken_key" ON "Activator"("telegramLinkToken");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_telegramLinkToken_key" ON "Admin"("telegramLinkToken");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_telegramLinkToken_key" ON "Distributor"("telegramLinkToken");

