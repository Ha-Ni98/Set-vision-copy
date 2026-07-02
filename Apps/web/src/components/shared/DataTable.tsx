import type { ReactNode } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  getRowKey: (row: TData) => string;
  renderMobileRow: (row: TData) => ReactNode;
  emptyState?: ReactNode;
}

// Sorting in this app is a frontend concern applied to `data` before it reaches this
// component (e.g. a page-level control re-sorts an array) — see codebase-map §8.Q3 —
// so this table intentionally has no interactive column-header sorting UI.
export function DataTable<TData>({ columns, data, getRowKey, renderMobileRow, emptyState }: Props<TData>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/40">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs uppercase tracking-wide text-muted-foreground">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y divide-border md:hidden">
        {data.map((row) => (
          <div key={getRowKey(row)}>{renderMobileRow(row)}</div>
        ))}
      </div>
    </div>
  );
}
