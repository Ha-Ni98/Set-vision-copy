import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  title: string;
  body: string;
  decoration?: ReactNode;
  dashed?: boolean;
}

export function EmptyState({ icon, title, body, decoration, dashed = true }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-card)]",
        dashed && "border-dashed",
      )}
    >
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {decoration}
    </div>
  );
}
