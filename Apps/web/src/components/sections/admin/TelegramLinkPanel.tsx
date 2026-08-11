import { useState } from "react";
import type { UserRole } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { StatusPill } from "@/components/shared/StatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  useTelegramLink,
  useGenerateTelegramToken,
  useUnlinkTelegram,
} from "@/hooks/useTelegramLink";
import { formatDateTime } from "@/lib/utils";

interface Props {
  role: UserRole;
  profileId: string;
}

// Mounted at three points (activator detail, distributor detail, admin accounts dialog) —
// self-contained, calls its own hooks, layout survives loading/error (front-end-rules §4).
export function TelegramLinkPanel({ role, profileId }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

  const linkQuery = useTelegramLink(role, profileId);
  const generateToken = useGenerateTelegramToken(role, profileId);
  const unlinkTelegram = useUnlinkTelegram(role, profileId);

  if (linkQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-9 w-full max-w-sm" />
      </div>
    );
  }

  if (linkQuery.isError || !linkQuery.data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-foreground">{t("admin.telegram.title")}</h3>
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={
            <Button size="sm" onClick={() => linkQuery.refetch()}>
              {t("common.actions.tryAgain")}
            </Button>
          }
        />
      </div>
    );
  }

  const status = linkQuery.data;
  const isMutating = generateToken.isPending || unlinkTelegram.isPending;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("admin.telegram.title")}</h3>
        {status.isLinked && status.linkedAt && (
          <StatusPill
            tone="success"
            label={`${t("admin.telegram.linked")} · ${formatDateTime(status.linkedAt, language)}`}
          />
        )}
      </div>

      {status.isLinked ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateToken.mutate()}
              disabled={isMutating}
            >
              {t("admin.telegram.generateNew")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlinkConfirmOpen(true)}
              disabled={isMutating}
            >
              {t("admin.telegram.unlink")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("admin.telegram.replaceWarning")}</p>
        </div>
      ) : status.hasPendingToken && status.deepLink ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex max-w-sm items-center gap-1 rounded-md border border-border bg-muted/40 py-1 pl-3">
            <code className="flex-1 truncate text-xs">{status.deepLink}</code>
            <CopyButton text={status.deepLink} />
          </div>
          <p className="text-xs text-muted-foreground">{t("admin.telegram.singleUseHint")}</p>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => generateToken.mutate()}
            disabled={isMutating}
          >
            {t("admin.telegram.regenerate")}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{t("admin.telegram.notLinked")}</p>
          <Button
            size="sm"
            className="self-start"
            onClick={() => generateToken.mutate()}
            disabled={isMutating}
          >
            {t("admin.telegram.generate")}
          </Button>
        </div>
      )}

      <AlertDialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.telegram.unlinkConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.telegram.unlinkConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isMutating}
              onClick={() => {
                unlinkTelegram.mutate();
                setUnlinkConfirmOpen(false);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
