import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DeliveryCompanyDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Pencil, Power, Truck, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useDeliveryCompanies,
  useCreateDeliveryCompany,
  useUpdateDeliveryCompany,
  useToggleDeliveryCompany,
} from "@/hooks/useDeliveryCompanies";
import { CompanyModal } from "./CompanyModal";

export function DeliveryCompaniesTab() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<DeliveryCompanyDTO | null>(null);
  const [toggleRow, setToggleRow] = useState<DeliveryCompanyDTO | null>(null);

  const companiesQuery = useDeliveryCompanies({});
  const createCompany = useCreateDeliveryCompany();
  const updateCompany = useUpdateDeliveryCompany();
  const toggleCompany = useToggleDeliveryCompany();

  const columns = useMemo<ColumnDef<DeliveryCompanyDTO>[]>(
    () => [
      { accessorKey: "name", header: t("admin.settings.companies.table.name") },
      { accessorKey: "registeredName", header: t("admin.settings.companies.table.registeredName") },
      {
        id: "status",
        header: t("admin.settings.companies.table.status"),
        cell: ({ row }) => <EnabledBadge isEnabled={row.original.isActive} />,
      },
      {
        id: "actions",
        header: t("admin.settings.companies.table.actions"),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditRow(row.original)}>
                <Pencil className="mr-2 h-4 w-4" /> {t("common.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setToggleRow(row.original)}>
                <Power className="mr-2 h-4 w-4" />
                {row.original.isActive ? t("common.actions.disable") : t("common.actions.enable")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.settings.companies.create.title")}
        </Button>
      </div>

      {companiesQuery.isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : companiesQuery.isError ? (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={
            <Button onClick={() => companiesQuery.refetch()}>{t("common.actions.tryAgain")}</Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={companiesQuery.data ?? []}
          getRowKey={(row) => row.id}
          renderMobileRow={(row) => (
            <div className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-muted-foreground">{row.registeredName}</div>
              </div>
              <EnabledBadge isEnabled={row.isActive} />
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title={t("admin.settings.companies.empty.noCompanies")}
              body=""
            />
          }
        />
      )}

      <CompanyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) =>
          createCompany.mutate(values, { onSuccess: () => setCreateOpen(false) })
        }
        isPending={createCompany.isPending}
      />

      <CompanyModal
        open={editRow !== null}
        onOpenChange={(open) => !open && setEditRow(null)}
        company={editRow}
        isPending={updateCompany.isPending}
        onSubmit={(values) => {
          if (!editRow) return;
          updateCompany.mutate(
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
                toggleRow?.isActive
                  ? "admin.settings.companies.toggleConfirm.disableTitle"
                  : "admin.settings.companies.toggleConfirm.enableTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={toggleCompany.isPending}
              onClick={() => {
                if (toggleRow) toggleCompany.mutate(toggleRow.id);
                setToggleRow(null);
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
