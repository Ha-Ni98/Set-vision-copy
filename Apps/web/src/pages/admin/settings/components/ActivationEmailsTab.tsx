import { useMemo, useState } from "react";
import axios from "axios";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActivationEmailDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Mail, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useActivationEmails,
  useAddActivationEmail,
  useDeleteActivationEmail,
} from "@/hooks/useActivationEmails";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { formatDateTime } from "@/lib/utils";
import { AddActivationEmailModal } from "./AddActivationEmailModal";

const LIMIT = 10;
const ALL = "__all__";

// Modelled on AdminAccountsTab (Set 10 plan §0.3, §7.2) — self-contained, owns its own
// filters, pagination and hooks; Radix unmounts inactive TabsContent so this tab's queries
// fire only once first activated.
export function ActivationEmailsTab() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ActivationEmailDTO | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const plansQuery = useSubscriptionPlans({ active: true });
  const emailsQuery = useActivationEmails({
    page,
    limit: LIMIT,
    subscriptionPlanId: subscriptionPlanId || undefined,
    search: debouncedSearch || undefined,
  });

  const addEmail = useAddActivationEmail();
  const deleteEmail = useDeleteActivationEmail();

  const hasFilters = search.length > 0 || subscriptionPlanId.length > 0;
  const clearFilters = () => {
    setSearch("");
    setSubscriptionPlanId("");
    setPage(1);
  };

  const columns = useMemo<ColumnDef<ActivationEmailDTO>[]>(
    () => [
      { accessorKey: "planLabel", header: t("admin.settings.activationEmails.table.plan") },
      { accessorKey: "email", header: t("admin.settings.activationEmails.table.email") },
      {
        accessorKey: "nbOfActivation",
        header: t("admin.settings.activationEmails.table.usageCount"),
      },
      {
        id: "lastUsed",
        header: t("admin.settings.activationEmails.table.lastUsed"),
        accessorFn: (row) => (row.lastUsedAt ? formatDateTime(row.lastUsedAt, language) : "—"),
      },
      {
        id: "actions",
        header: t("admin.settings.activationEmails.table.actions"),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.actions.delete")}
            onClick={() => setDeleteRow(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [t, language],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("admin.settings.activationEmails.note")}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("admin.settings.activationEmails.search.placeholder")}
              className="pl-9"
            />
          </div>

          <Select
            value={subscriptionPlanId || ALL}
            onValueChange={(v) => {
              setSubscriptionPlanId(v === ALL ? "" : v);
              setPage(1);
            }}
            disabled={plansQuery.isLoading || plansQuery.isError}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("admin.settings.activationEmails.filters.plan")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t("admin.settings.activationEmails.filters.plan")}
              </SelectItem>
              {(plansQuery.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.settings.activationEmails.add.title")}
        </Button>
      </div>

      {emailsQuery.isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : emailsQuery.isError ? (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={
            <Button onClick={() => emailsQuery.refetch()}>{t("common.actions.tryAgain")}</Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={emailsQuery.data?.items ?? []}
          getRowKey={(row) => row.id}
          renderMobileRow={(row) => (
            <div className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-semibold">{row.email}</div>
                <div className="text-muted-foreground">
                  {row.planLabel} · {row.nbOfActivation}
                </div>
              </div>
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Mail className="h-6 w-6" />}
              title={t(
                hasFilters
                  ? "admin.settings.activationEmails.empty.noMatch"
                  : "admin.settings.activationEmails.empty.noEmails",
              )}
              body=""
              decoration={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters} className="mt-2">
                    {t("common.actions.clear")}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {emailsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={emailsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <AddActivationEmailModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setDuplicateError(false);
        }}
        isPending={addEmail.isPending}
        duplicateError={duplicateError}
        onSubmit={(values) => {
          setDuplicateError(false);
          addEmail.mutate(values, {
            onSuccess: () => setCreateOpen(false),
            onError: (error) => {
              if (axios.isAxiosError(error) && error.response?.status === 409) {
                setDuplicateError(true);
              }
            },
          });
        }}
      />

      <AlertDialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.settings.activationEmails.deleteConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.settings.activationEmails.deleteConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEmail.isPending}
              onClick={() => {
                if (deleteRow) deleteEmail.mutate(deleteRow.id);
                setDeleteRow(null);
              }}
            >
              {t("common.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
