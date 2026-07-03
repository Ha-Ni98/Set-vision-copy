import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { AdminAccountsTab } from "./components/AdminAccountsTab";
import { CommissionMatrixTab } from "./components/CommissionMatrixTab";
import { SubscriptionPlansTab } from "./components/SubscriptionPlansTab";
import { DeliveryCompaniesTab } from "./components/DeliveryCompaniesTab";

// Static composition — no data hooks yet (wired in Sprint 5, plan.md §D4). Exactly 4 tabs —
// Timeout/Active-Hours are omitted from the tab bar entirely (§E-1, user decision).
export default function SettingsPage() {
  const { t } = useTranslation();
  const [adminSearch, setAdminSearch] = useState("");
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.settings.title")} />

      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins">{t("admin.settings.tabs.adminAccounts")}</TabsTrigger>
          <TabsTrigger value="commission">{t("admin.settings.tabs.commission")}</TabsTrigger>
          <TabsTrigger value="plans">{t("admin.settings.tabs.subscriptionPlans")}</TabsTrigger>
          <TabsTrigger value="companies">{t("admin.settings.tabs.deliveryCompanies")}</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <AdminAccountsTab
            search={adminSearch}
            onSearchChange={setAdminSearch}
            isLoading
            isError={false}
            onRetry={() => {}}
            hasFilters={adminSearch.length > 0}
            onClearFilters={() => setAdminSearch("")}
            createOpen={createAdminOpen}
            onCreateOpenChange={setCreateAdminOpen}
            onCreateSubmit={() => {}}
            onToggle={() => {}}
            onResetPassword={() => {}}
            onDelete={() => {}}
            onEditSubmit={() => {}}
          />
        </TabsContent>

        <TabsContent value="commission">
          <CommissionMatrixTab
            isLoading
            isError={false}
            onRetry={() => {}}
            onCellSubmit={() => {}}
          />
        </TabsContent>

        <TabsContent value="plans">
          <SubscriptionPlansTab
            isLoading
            isError={false}
            onRetry={() => {}}
            createOpen={createPlanOpen}
            onCreateOpenChange={setCreatePlanOpen}
            onCreateSubmit={() => {}}
            onToggle={() => {}}
          />
        </TabsContent>

        <TabsContent value="companies">
          <DeliveryCompaniesTab
            isLoading
            isError={false}
            onRetry={() => {}}
            createOpen={createCompanyOpen}
            onCreateOpenChange={setCreateCompanyOpen}
            onCreateSubmit={() => {}}
            onEditSubmit={() => {}}
            onToggle={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
