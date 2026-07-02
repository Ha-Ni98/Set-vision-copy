import { CopyButton } from "@/components/shared/CopyButton";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  password: string;
}

// One-time secret display — the caller is responsible for never re-fetching or persisting
// this value; it only ever exists in the create/reset mutation's own response (rules §0.1.1).
export function GeneratedPasswordPanel({ password }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-success/40 bg-success/10 p-4">
      <p className="text-sm font-semibold text-foreground">
        {t("admin.activators.create.successTitle")}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <code className="font-mono text-sm">{password}</code>
        <CopyButton text={password} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("admin.activators.create.successBody")}
      </p>
    </div>
  );
}
