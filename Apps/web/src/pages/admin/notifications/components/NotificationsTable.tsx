import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { NotificationDTO } from "@my-app/contract";
import { NotificationStat } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { NotificationStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
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
import { BellRing, RotateCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { useResendNotification } from "@/hooks/useNotifications";
import { NotificationBodyDialog } from "./NotificationBodyDialog";

interface Props {
  data?: NotificationDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function truncate(body: string, max = 60): string {
  return body.length > max ? `${body.slice(0, max)}…` : body;
}

export function NotificationsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [viewRow, setViewRow] = useState<NotificationDTO | null>(null);
  const [resendRow, setResendRow] = useState<NotificationDTO | null>(null);
  const resendNotification = useResendNotification();

  const columns = useMemo<ColumnDef<NotificationDTO>[]>(
    () => [
      {
        id: "createdAt",
        header: t("admin.notifications.table.date"),
        cell: ({ row }) => (
          <span title={formatDateTime(row.original.createdAt, language)}>
            {formatRelativeTime(row.original.createdAt, language)}
          </span>
        ),
      },
      { accessorKey: "recipientName", header: t("admin.notifications.table.recipient") },
      {
        id: "type",
        header: t("admin.notifications.table.type"),
        cell: ({ row }) => t(`enums.notificationType.${row.original.type}`),
      },
      {
        id: "channel",
        header: t("admin.notifications.table.channel"),
        cell: ({ row }) => t(`enums.notificationChannel.${row.original.channel}`),
      },
      {
        id: "stat",
        header: t("admin.notifications.table.status"),
        cell: ({ row }) => <NotificationStatusBadge status={row.original.stat} />,
      },
      { accessorKey: "attempts", header: t("admin.notifications.table.attempts") },
      {
        id: "body",
        header: t("admin.notifications.table.body"),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setViewRow(row.original)}
            className="text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {truncate(row.original.body)}
          </button>
        ),
      },
      {
        id: "actions",
        header: t("admin.notifications.table.actions"),
        cell: ({ row }) =>
          row.original.stat === NotificationStat.FAILED ? (
            <Button variant="outline" size="sm" onClick={() => setResendRow(row.original)}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> {t("admin.notifications.resend")}
            </Button>
          ) : null,
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={7} />;
  if (isError) {
    return (
      <NotFoundState
        title={t("admin.dashboard.sectionError")}
        body={t("admin.dashboard.sectionErrorBody")}
        action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
      />
    );
  }

  const rows = data ?? [];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(row) => row.id}
        renderMobileRow={(row) => (
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-semibold">{row.recipientName}</div>
              <div className="text-muted-foreground">
                {t(`enums.notificationType.${row.type}`)} ·{" "}
                <span title={formatDateTime(row.createdAt, language)}>
                  {formatRelativeTime(row.createdAt, language)}
                </span>
              </div>
            </div>
            <NotificationStatusBadge status={row.stat} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<BellRing className="h-6 w-6" />}
            title={t(
              hasFilters
                ? "admin.notifications.empty.noMatch"
                : "admin.notifications.empty.noNotifications",
            )}
            body=""
            decoration={
              hasFilters ? (
                <Button variant="outline" onClick={onClearFilters} className="mt-2">
                  {t("common.actions.clear")}
                </Button>
              ) : undefined
            }
          />
        }
      />

      <NotificationBodyDialog
        notification={viewRow}
        onOpenChange={(open) => !open && setViewRow(null)}
      />

      <AlertDialog open={resendRow !== null} onOpenChange={(open) => !open && setResendRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.notifications.resendConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={resendNotification.isPending}
              onClick={() => {
                if (resendRow) resendNotification.mutate(resendRow.id);
                setResendRow(null);
              }}
            >
              {t("admin.notifications.resend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
