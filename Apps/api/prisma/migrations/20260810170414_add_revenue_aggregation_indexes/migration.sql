-- CreateIndex
CREATE INDEX "Activation_activationStat_completedAt_idx" ON "Activation"("activationStat", "completedAt");

-- CreateIndex
CREATE INDEX "Order_orderStat_completedAt_idx" ON "Order"("orderStat", "completedAt");
