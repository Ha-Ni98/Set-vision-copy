import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
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
import { Search, Users, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { AdminActionsMenu } from "./AdminActionsMenu";
import { AddAdminModal } from "./AddAdminModal";
import { EditAdminModal } from "./EditAdminModal";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  data?: AdminDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  currentAdminId?: string;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCreateSubmit: () => void;
  createPending?: boolean;
  generatedPassword?: string | null;
  onToggle: (admin: AdminDTO) => void;
  onResetPassword: (admin: AdminDTO) => void;
  onDelete: (admin: AdminDTO) => void;
  onEditSubmit: (admin: AdminDTO) => void;
  editPending?: boolean;
  isMutating?: boolean;
}

export function AdminAccountsTab({
  search,
  onSearchChange,
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  currentAdminId,
  createOpen,
  onCreateOpenChange,
  onCreateSubmit,
  createPending,
  generatedPassword,
  onToggle,
  onResetPassword,
  onDelete,
  onEditSubmit,
  editPending,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [editRow, setEditRow] = useState<AdminDTO | null>(null);
  const [toggleRow, setToggleRow] = useState<AdminDTO | null>(null);
  const [resetRow, setResetRow] = useState<AdminDTO | null>(null);
  const [deleteRow, setDeleteRow] = useState<AdminDTO | null>(null);

  const totalAdmins = data?.length ?? 0;

  const columns = useMemo<ColumnDef<AdminDTO>[]>(
    () => [
      { accessorKey: "fullName", header: t("admin.settings.admins.table.fullName") },
      { accessorKey: "username", header: t("admin.settings.admins.table.username") },
      { accessorKey: "phone", header: t("admin.settings.admins.table.phone") },
      {
        id: "lastLogin",
        header: t("admin.settings.admins.table.lastLogin"),
        accessorFn: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt, language) : "—"),
      },
      {
        id: "status",
        header: t("admin.settings.admins.table.status"),
        cell: ({ row }) => <EnabledBadge isEnabled={row.original.isEnabled} />,
      },
      {
        id: "actions",
        header: t("admin.settings.admins.table.actions"),
        cell: ({ row }) => (
          <AdminActionsMenu
            admin={row.original}
            onRequestEdit={setEditRow}
            onRequestToggle={setToggleRow}
            onRequestResetPassword={setResetRow}
            onRequestDelete={setDeleteRow}
            deleteDisabled={row.original.id === currentAdminId || totalAdmins <= 1}
          />
        ),
      },
    ],
    [t, language, currentAdminId, totalAdmins],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("admin.settings.admins.search.placeholder")}
            className="pl-9"
          />
        </div>
        <Button onClick={() => onCreateOpenChange(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.settings.admins.create.title")}
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : isError ? (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          getRowKey={(row) => row.id}
          renderMobileRow={(row) => (
            <div className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-semibold">{row.fullName}</div>
                <div className="text-muted-foreground">{row.username}</div>
              </div>
              <EnabledBadge isEnabled={row.isEnabled} />
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={t(
                hasFilters
                  ? "admin.settings.admins.empty.noMatch"
                  : "admin.settings.admins.empty.noAdmins",
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
      )}

      <AddAdminModal
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onSubmit={onCreateSubmit}
        isPending={createPending}
        generatedPassword={generatedPassword}
      />

      <EditAdminModal
        open={editRow !== null}
        onOpenChange={(open) => !open && setEditRow(null)}
        admin={editRow}
        isPending={editPending}
        onSubmit={() => {
          if (editRow) onEditSubmit(editRow);
          setEditRow(null);
        }}
      />

      <AlertDialog open={toggleRow !== null} onOpenChange={(open) => !open && setToggleRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                toggleRow?.isEnabled
                  ? "admin.settings.admins.toggleConfirm.disableTitle"
                  : "admin.settings.admins.toggleConfirm.enableTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (toggleRow) onToggle(toggleRow);
                setToggleRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetRow !== null} onOpenChange={(open) => !open && setResetRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.settings.admins.resetPasswordConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.settings.admins.resetPasswordConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (resetRow) onResetPassword(resetRow);
                setResetRow(null);
              }}
            >
              {t("common.actions.resetPassword")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.settings.admins.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isMutating}
              onClick={() => {
                if (deleteRow) onDelete(deleteRow);
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
