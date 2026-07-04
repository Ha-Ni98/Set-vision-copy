import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  trend?: ReactNode;
  innerRef?: React.Ref<HTMLDivElement>;
  /** "centered" matches the landing-page StatsRow treatment (bigger round icon, hover lift). */
  variant?: "default" | "centered";
}

export function StatCard({ icon, label, value, trend, innerRef, variant = "default" }: Props) {
  const centered = variant === "centered";
  return (
    <div
      ref={innerRef}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        centered && "text-center transition-transform hover:-translate-y-1",
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-center bg-primary-light text-primary",
          centered ? "mx-auto h-12 w-12 rounded-full" : "h-10 w-10 rounded-xl",
        )}
      >
        {icon}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-extrabold text-foreground", centered ? "text-3xl" : "text-2xl")}>{value}</div>
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  );
}
