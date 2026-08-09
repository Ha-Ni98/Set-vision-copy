import { Store } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";

// Empty shell — no hooks, no queries, no data. Set 1's whole deliverable for this page is
// the role-gated route + shell; content (orders, requests) is out of scope (v2-decisions.md
// D1/D5/D11).
export default function PortalPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("distributor.portal.title")} />
      <EmptyState
        icon={<Store className="h-6 w-6" />}
        title={t("distributor.portal.emptyTitle")}
        body={t("distributor.portal.emptyBody")}
      />
    </div>
  );
}
