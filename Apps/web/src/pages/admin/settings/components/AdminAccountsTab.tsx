import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UserRole, type AdminDTO } from "@my-app/contract";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Users, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSession } from "@/hooks/useSession";
import {
  useAdmins,
  useCreateAdmin,
  useUpdateAdmin,
  useToggleAdmin,
  useResetAdminPassword,
  useDeleteAdmin,
} from "@/hooks/useAdmins";
import { formatDateTime } from "@/lib/utils";
import { GeneratedPasswordPanel } from "../../activators/components/GeneratedPasswordPanel";
import { TelegramLinkPanel } from "@/components/sections/admin/TelegramLinkPanel";
import { AdminActionsMenu } from "./AdminActionsMenu";
import { AddAdminModal } from "./AddAdminModal";
import { EditAdminModal } from "./EditAdminModal";

// Self-contained, like every Part-3 modal/heatmap component — calls its own hooks rather
// than receiving data via page-level props. Combined with Radix Tabs unmounting inactive
// panels by default, this tab's queries only ever run once the tab is first activated.
export function AdminAccountsTab() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AdminDTO | null>(null);
  const [toggleRow, setToggleRow] = useState<AdminDTO | null>(null);
  const [resetRow, setResetRow] = useState<AdminDTO | null>(null);
  const [resetGeneratedPassword, setResetGeneratedPassword] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<AdminDTO | null>(null);
  const [telegramRow, setTelegramRow] = useState<AdminDTO | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const sessionQuery = useSession();
  const adminsQuery = useAdmins({ page: 1, limit: 100, search: debouncedSearch || undefined });

  const createAdmin = useCreateAdmin();
  const updateAdmin = useUpdateAdmin();
  const toggleAdmin = useToggleAdmin();
  const resetAdminPassword = useResetAdminPassword();
  const deleteAdmin = useDeleteAdmin();
  const isMutating =
    toggleAdmin.isPending ||
    resetAdminPassword.isPending ||
    deleteAdmin.isPending ||
    updateAdmin.isPending;

  const hasFilters = search.length > 0;
  const totalAdmins = adminsQuery.data?.items.length ?? 0;

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
        cell: ({ row }) => {
          const isSelf = row.original.id === sessionQuery.data?.id;
          const isLast = totalAdmins <= 1;
          return (
            <AdminActionsMenu
              admin={row.original}
              onRequestEdit={setEditRow}
              onRequestToggle={setToggleRow}
              onRequestResetPassword={setResetRow}
              onRequestTelegram={setTelegramRow}
              onRequestDelete={setDeleteRow}
              deleteDisabled={isSelf || isLast}
              deleteDisabledReason={isSelf ? "self" : isLast ? "last" : undefined}
            />
          );
        },
      },
    ],
    [t, language, sessionQuery.data?.id, totalAdmins],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.settings.admins.search.placeholder")}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.settings.admins.create.title")}
        </Button>
      </div>

      {adminsQuery.isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : adminsQuery.isError ? (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={
            <Button onClick={() => adminsQuery.refetch()}>{t("common.actions.tryAgain")}</Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={adminsQuery.data?.items ?? []}
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
                  <Button variant="outline" onClick={() => setSearch("")} className="mt-2">
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
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setGeneratedPassword(null);
        }}
        onSubmit={(values) =>
          createAdmin.mutate(values, {
            onSuccess: (data) => setGeneratedPassword(data.generatedPassword),
          })
        }
        isPending={createAdmin.isPending}
        generatedPassword={generatedPassword}
      />

      <EditAdminModal
        open={editRow !== null}
        onOpenChange={(open) => !open && setEditRow(null)}
        admin={editRow}
        isPending={updateAdmin.isPending}
        onSubmit={(values) => {
          if (!editRow) return;
          updateAdmin.mutate(
            { id: editRow.id, command: values },
            { onSuccess: () => setEditRow(null) },
          );
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
                if (toggleRow) toggleAdmin.mutate(toggleRow.id);
                setToggleRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetRow(null);
            setResetGeneratedPassword(null);
          }
        }}
      >
        <AlertDialogContent>
          {resetGeneratedPassword ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("admin.settings.admins.resetPasswordConfirm.successTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription />
              </AlertDialogHeader>
              <GeneratedPasswordPanel
                password={resetGeneratedPassword}
                titleKey="admin.settings.admins.resetPasswordConfirm.successTitle"
                bodyKey="admin.settings.admins.resetPasswordConfirm.successBody"
              />
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setResetRow(null)}>
                  {t("common.actions.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
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
                {/* Plain Button, not AlertDialogAction — Action is Radix's DialogPrimitive.Close
                    under the hood and always closes on click, which would skip the one-time
                    reveal step below entirely. */}
                <Button
                  disabled={isMutating}
                  onClick={() => {
                    if (!resetRow) return;
                    resetAdminPassword.mutate(resetRow.id, {
                      onSuccess: (data) => setResetGeneratedPassword(data.generatedPassword),
                    });
                  }}
                >
                  {t("common.actions.resetPassword")}
                </Button>
              </AlertDialogFooter>
            </>
          )}
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
                if (deleteRow) deleteAdmin.mutate(deleteRow.id);
                setDeleteRow(null);
              }}
            >
              {t("common.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={telegramRow !== null} onOpenChange={(open) => !open && setTelegramRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.telegram.title")}</DialogTitle>
          </DialogHeader>
          {telegramRow && <TelegramLinkPanel role={UserRole.ADMIN} profileId={telegramRow.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
