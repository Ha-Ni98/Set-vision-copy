-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACTIVATOR');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('SNAPCHAT_PLUS');

-- CreateEnum
CREATE TYPE "SubscriptionDuration" AS ENUM ('ONE_DAY', 'ONE_WEEK', 'TWO_WEEK', 'ONE_MONTH', 'THREE_MONTH', 'SIXTH_MONTH', 'ONE_YEAR', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "CardStat" AS ENUM ('IN_SET', 'PRINTED', 'IN_LOT', 'AT_DISTRIBUTOR', 'ACTIVATION_PROGRESS', 'ACTIVATED', 'ACTIVATION_FAILED');

-- CreateEnum
CREATE TYPE "SetStat" AS ENUM ('NOT_PRINTED', 'PENDING_PRINTING', 'PRINTED');

-- CreateEnum
CREATE TYPE "LotStat" AS ENUM ('PENDING', 'IN_DELIVERY', 'DELIVERED', 'RETURNED');

-- CreateEnum
CREATE TYPE "OrderStat" AS ENUM ('PENDING_DELIVERY', 'IN_DELIVERY', 'DELIVERED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ActivationStat" AS ENUM ('PENDING', 'PROCESSING', 'WRONG_INFORMATION', 'ADDITIONAL_INFORMATION', 'FREEZE', 'ACTIVATED', 'ACTIVATED_BY_ADMIN', 'CANCELLED_BY_ACTIVATOR', 'REMOVED_FROM_ACTIVATOR', 'CANCELLED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('HOME', 'PICKUP_POINT', 'STORE');

-- CreateEnum
CREATE TYPE "AccountInformation" AS ENUM ('USERNAME', 'EMAIL', 'PHONE_NUMBER', 'OTP', 'BIRTHDAY', 'PASSWORD');

-- CreateEnum
CREATE TYPE "LogActionType" AS ENUM ('CHANGE_USER_PASSWORD', 'CHANGE_USER_STAT', 'CHANGE_USER_INFORMATION', 'SET_PAYMENT', 'DELETE_PAYMENT', 'ADD_DISTRIBUTOR', 'CHANGE_DISTRIBUTOR_INFORMATION', 'CHANGE_DISTRIBUTOR_STAT', 'CHANGE_ACTIVATION_COMMISSION', 'REMOVE_LOT', 'REMOVE_SET', 'REMOVE_CARD', 'REVOKE_CARD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "totalEarning" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credits" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nbOfActivation" INTEGER NOT NULL DEFAULT 0,
    "nbOfSuccessfulActivation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Activator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "actionType" "LogActionType" NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "activatorId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "previousCredits" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "subscriptionType" "SubscriptionType" NOT NULL,
    "subscriptionDuration" "SubscriptionDuration" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionDuration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "nbMinuteMin" INTEGER NOT NULL,
    "nbMinuteMax" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionDuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlanCommission" (
    "id" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "commissionDurationId" TEXT NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SubscriptionPlanCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "setNumber" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "numberOfKeys" INTEGER NOT NULL,
    "setStat" "SetStat" NOT NULL DEFAULT 'NOT_PRINTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedAt" TIMESTAMP(3),

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "lotStat" "LotStat" NOT NULL DEFAULT 'PENDING',
    "nbOfCards" INTEGER NOT NULL DEFAULT 0,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "receivedName" TEXT NOT NULL,
    "receivedPhone" TEXT NOT NULL,
    "wilayaId" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "deliveryCompanyId" TEXT NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "orderPrice" DECIMAL(12,2) NOT NULL,
    "deliverPrice" DECIMAL(12,2) NOT NULL,
    "cardsDeliveredCount" INTEGER NOT NULL DEFAULT 0,
    "orderStat" "OrderStat" NOT NULL DEFAULT 'PENDING_DELIVERY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLot" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,

    CONSTRAINT "OrderLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "lotId" TEXT,
    "distributorId" TEXT,
    "cardStat" "CardStat" NOT NULL DEFAULT 'IN_SET',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "activatorId" TEXT,
    "activationStat" "ActivationStat" NOT NULL DEFAULT 'PENDING',
    "clientFullName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "activationEmail" TEXT,
    "activationPrice" DECIMAL(12,2),
    "freezReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationInformation" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "accountInform" "AccountInformation" NOT NULL,
    "value" TEXT,

    CONSTRAINT "ActivationInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationStep" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "activationStat" "ActivationStat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongInformation" (
    "id" TEXT NOT NULL,
    "activationStepId" TEXT NOT NULL,
    "accountInform" "AccountInformation" NOT NULL,
    "value" TEXT,

    CONSTRAINT "WrongInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalInformation" (
    "id" TEXT NOT NULL,
    "activationStepId" TEXT NOT NULL,
    "accountInform" "AccountInformation" NOT NULL,
    "value" TEXT,

    CONSTRAINT "AdditionalInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wilaya" (
    "id" TEXT NOT NULL,
    "wilayaCode" TEXT NOT NULL,
    "frName" TEXT NOT NULL,
    "arName" TEXT NOT NULL,

    CONSTRAINT "Wilaya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commune" (
    "id" TEXT NOT NULL,
    "communeCode" TEXT NOT NULL,
    "wilayaId" TEXT NOT NULL,
    "frName" TEXT NOT NULL,
    "arName" TEXT NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registeredName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "phone" TEXT,
    "wilayaId" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nbOfActiveCards" INTEGER NOT NULL DEFAULT 0,
    "nbOfActivation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isEnabled_idx" ON "User"("isEnabled");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Activator_userId_key" ON "Activator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Log_userId_idx" ON "Log"("userId");

-- CreateIndex
CREATE INDEX "Log_actionType_idx" ON "Log"("actionType");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_activatorId_idx" ON "Payment"("activatorId");

-- CreateIndex
CREATE INDEX "Payment_adminId_idx" ON "Payment"("adminId");

-- CreateIndex
CREATE INDEX "Payment_isDeleted_idx" ON "Payment"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_subscriptionType_subscriptionDuration_key" ON "SubscriptionPlan"("subscriptionType", "subscriptionDuration");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionDuration_key_key" ON "CommissionDuration"("key");

-- CreateIndex
CREATE INDEX "SubscriptionPlanCommission_subscriptionPlanId_idx" ON "SubscriptionPlanCommission"("subscriptionPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanCommission_subscriptionPlanId_commissionDur_key" ON "SubscriptionPlanCommission"("subscriptionPlanId", "commissionDurationId");

-- CreateIndex
CREATE UNIQUE INDEX "Set_setNumber_key" ON "Set"("setNumber");

-- CreateIndex
CREATE INDEX "Set_setStat_idx" ON "Set"("setStat");

-- CreateIndex
CREATE INDEX "Set_subscriptionPlanId_idx" ON "Set"("subscriptionPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotNumber_key" ON "Lot"("lotNumber");

-- CreateIndex
CREATE INDEX "Lot_lotStat_idx" ON "Lot"("lotStat");

-- CreateIndex
CREATE INDEX "Lot_subscriptionPlanId_idx" ON "Lot"("subscriptionPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_distributorId_idx" ON "Order"("distributorId");

-- CreateIndex
CREATE INDEX "Order_orderStat_idx" ON "Order"("orderStat");

-- CreateIndex
CREATE INDEX "Order_wilayaId_idx" ON "Order"("wilayaId");

-- CreateIndex
CREATE INDEX "Order_deliveryCompanyId_idx" ON "Order"("deliveryCompanyId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderLot_orderId_idx" ON "OrderLot"("orderId");

-- CreateIndex
CREATE INDEX "OrderLot_lotId_idx" ON "OrderLot"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLot_orderId_lotId_key" ON "OrderLot"("orderId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_key_key" ON "Card"("key");

-- CreateIndex
CREATE INDEX "Card_cardStat_idx" ON "Card"("cardStat");

-- CreateIndex
CREATE INDEX "Card_distributorId_idx" ON "Card"("distributorId");

-- CreateIndex
CREATE INDEX "Card_lotId_idx" ON "Card"("lotId");

-- CreateIndex
CREATE INDEX "Card_setId_idx" ON "Card"("setId");

-- CreateIndex
CREATE INDEX "Card_subscriptionPlanId_idx" ON "Card"("subscriptionPlanId");

-- CreateIndex
CREATE INDEX "Card_isActive_idx" ON "Card"("isActive");

-- CreateIndex
CREATE INDEX "Activation_cardId_idx" ON "Activation"("cardId");

-- CreateIndex
CREATE INDEX "Activation_activatorId_idx" ON "Activation"("activatorId");

-- CreateIndex
CREATE INDEX "Activation_activationStat_idx" ON "Activation"("activationStat");

-- CreateIndex
CREATE INDEX "Activation_requestedAt_idx" ON "Activation"("requestedAt");

-- CreateIndex
CREATE INDEX "Activation_completedAt_idx" ON "Activation"("completedAt");

-- CreateIndex
CREATE INDEX "ActivationInformation_activationId_idx" ON "ActivationInformation"("activationId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationInformation_activationId_accountInform_key" ON "ActivationInformation"("activationId", "accountInform");

-- CreateIndex
CREATE INDEX "ActivationStep_activationId_idx" ON "ActivationStep"("activationId");

-- CreateIndex
CREATE INDEX "WrongInformation_activationStepId_idx" ON "WrongInformation"("activationStepId");

-- CreateIndex
CREATE INDEX "AdditionalInformation_activationStepId_idx" ON "AdditionalInformation"("activationStepId");

-- CreateIndex
CREATE UNIQUE INDEX "Wilaya_wilayaCode_key" ON "Wilaya"("wilayaCode");

-- CreateIndex
CREATE UNIQUE INDEX "Commune_communeCode_key" ON "Commune"("communeCode");

-- CreateIndex
CREATE INDEX "Commune_wilayaId_idx" ON "Commune"("wilayaId");

-- CreateIndex
CREATE INDEX "Distributor_wilayaId_idx" ON "Distributor"("wilayaId");

-- CreateIndex
CREATE INDEX "Distributor_communeId_idx" ON "Distributor"("communeId");

-- CreateIndex
CREATE INDEX "Distributor_isEnabled_idx" ON "Distributor"("isEnabled");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activator" ADD CONSTRAINT "Activator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_activatorId_fkey" FOREIGN KEY ("activatorId") REFERENCES "Activator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlanCommission" ADD CONSTRAINT "SubscriptionPlanCommission_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlanCommission" ADD CONSTRAINT "SubscriptionPlanCommission_commissionDurationId_fkey" FOREIGN KEY ("commissionDurationId") REFERENCES "CommissionDuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_wilayaId_fkey" FOREIGN KEY ("wilayaId") REFERENCES "Wilaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "DeliveryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLot" ADD CONSTRAINT "OrderLot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLot" ADD CONSTRAINT "OrderLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_activatorId_fkey" FOREIGN KEY ("activatorId") REFERENCES "Activator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationInformation" ADD CONSTRAINT "ActivationInformation_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationStep" ADD CONSTRAINT "ActivationStep_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongInformation" ADD CONSTRAINT "WrongInformation_activationStepId_fkey" FOREIGN KEY ("activationStepId") REFERENCES "ActivationStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalInformation" ADD CONSTRAINT "AdditionalInformation_activationStepId_fkey" FOREIGN KEY ("activationStepId") REFERENCES "ActivationStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commune" ADD CONSTRAINT "Commune_wilayaId_fkey" FOREIGN KEY ("wilayaId") REFERENCES "Wilaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distributor" ADD CONSTRAINT "Distributor_wilayaId_fkey" FOREIGN KEY ("wilayaId") REFERENCES "Wilaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distributor" ADD CONSTRAINT "Distributor_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
