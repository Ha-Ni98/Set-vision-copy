import { Pencil, Power, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import type { ActivatorDetailDTO } from "@my-app/contract";

interface Props {
  activator: ActivatorDetailDTO;
  onEdit: () => void;
  onToggle: () => void;
  onResetPassword: () => void;
}

// Assumes valid data — the page owns the shared profile+stats loading/error/not-found gate
// (plan.md §D3.3), since both come from the same useActivator(id) query.
export function ProfileCard({ activator, onEdit, onToggle, onResetPassword }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{activator.fullName}</h2>
            <EnabledBadge isEnabled={activator.isEnabled} />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t("admin.activators.create.username")}</dt>
              <dd className="font-medium text-foreground">{activator.username}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("admin.activators.create.phone")}</dt>
              <dd className="font-medium text-foreground">{activator.phone}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> {t("common.actions.edit")}
          </Button>
          <Button variant="outline" size="sm" onClick={onToggle}>
            <Power className="mr-2 h-3.5 w-3.5" />
            {activator.isEnabled ? t("common.actions.disable") : t("common.actions.enable")}
          </Button>
          <Button variant="outline" size="sm" onClick={onResetPassword}>
            <KeyRound className="mr-2 h-3.5 w-3.5" /> {t("common.actions.resetPassword")}
          </Button>
        </div>
      </div>
    </div>
  );
}
