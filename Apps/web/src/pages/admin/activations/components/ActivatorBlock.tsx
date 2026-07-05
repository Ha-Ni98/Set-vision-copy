import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  activator: { id: string; fullName: string } | null;
}

export function ActivatorBlock({ activator }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.activator.title")}
      </h3>
      {activator ? (
        <Link
          to={`/admin/activators/${activator.id}`}
          className="font-medium text-primary hover:underline"
        >
          {activator.fullName}
        </Link>
      ) : (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={t("admin.activationDetail.activator.none")}
          body=""
          dashed={false}
        />
      )}
    </div>
  );
}
