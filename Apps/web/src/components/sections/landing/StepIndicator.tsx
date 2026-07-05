import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const STEP_KEYS = [
  "public.landing.steps.enterKey",
  "public.landing.steps.accountInfo",
  "public.landing.steps.activation",
];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("public.landing.steps.ariaLabel")}
      className="mx-auto flex max-w-md items-center justify-between px-2"
    >
      {STEP_KEYS.map((key, i) => {
        const step = i + 1;
        const completed = step < current;
        const active = step === current;
        const state = completed
          ? t("public.landing.steps.stateCompleted")
          : active
            ? t("public.landing.steps.stateCurrent")
            : t("public.landing.steps.stateUpcoming");
        return (
          <div
            key={key}
            className="flex flex-1 items-center last:flex-none"
            aria-current={active ? "step" : undefined}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all duration-300",
                  completed && "bg-success text-success-foreground",
                  active &&
                    "bg-primary text-primary-foreground shadow-[var(--shadow-glow)] scale-110",
                  !completed && !active && "bg-muted text-muted-foreground",
                )}
              >
                {completed ? <Check className="h-5 w-5" aria-hidden="true" /> : step}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium whitespace-nowrap transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(key)}
                <span className="sr-only"> — {state}</span>
              </span>
            </div>
            {step < STEP_KEYS.length && (
              <div className="mx-2 mb-6 h-0.5 flex-1 bg-muted relative overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-0 transition-transform duration-500 origin-left",
                    step < current ? "bg-success scale-x-100" : "bg-success scale-x-0",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
