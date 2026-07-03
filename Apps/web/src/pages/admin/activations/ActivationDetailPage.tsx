import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

// Static composition — no data hooks yet (wired in Sprint 3, plan.md §D2). The whole page
// comes from one useActivationDetail(id) query, so loading/error is one region, not
// per-block — each Block component below just renders whatever data it's given.
export default function ActivationDetailPage() {
  const { t } = useTranslation();
  const isLoading = true;
  const isError = false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.activationDetail.title")} />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <NotFoundState
          title={t("admin.activationDetail.notFound.title")}
          body=""
          action={
            <Button asChild variant="outline">
              <Link to="/admin/activations">{t("admin.activationDetail.notFound.backLink")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
