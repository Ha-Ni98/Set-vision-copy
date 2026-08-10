import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { AdminAccountsTab } from "./components/AdminAccountsTab";
import { CommissionMatrixTab } from "./components/CommissionMatrixTab";
import { SubscriptionPlansTab } from "./components/SubscriptionPlansTab";
import { DeliveryCompaniesTab } from "./components/DeliveryCompaniesTab";
import { PlanCostsTab } from "./components/PlanCostsTab";

// 5 tabs (was 4 — Set 9 added Plan Costs; Timeout/Active-Hours are still omitted from the
// tab bar entirely, §E-1, user decision). Each tab component is self-contained (owns its own
// hooks), so Radix's default unmount-when-inactive behavior on TabsContent is what actually
// gives each tab's queries "enabled on first activation, no upfront fan-out" — no manual
// `enabled` flags needed here.
export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.settings.title")} />

      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins">{t("admin.settings.tabs.adminAccounts")}</TabsTrigger>
          <TabsTrigger value="commission">{t("admin.settings.tabs.commission")}</TabsTrigger>
          <TabsTrigger value="planCosts">{t("admin.settings.tabs.planCosts")}</TabsTrigger>
          <TabsTrigger value="plans">{t("admin.settings.tabs.subscriptionPlans")}</TabsTrigger>
          <TabsTrigger value="companies">{t("admin.settings.tabs.deliveryCompanies")}</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <AdminAccountsTab />
        </TabsContent>

        <TabsContent value="commission">
          <CommissionMatrixTab />
        </TabsContent>

        <TabsContent value="planCosts">
          <PlanCostsTab />
        </TabsContent>

        <TabsContent value="plans">
          <SubscriptionPlansTab />
        </TabsContent>

        <TabsContent value="companies">
          <DeliveryCompaniesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
