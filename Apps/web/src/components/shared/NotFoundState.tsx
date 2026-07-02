import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  /** Large decorative text above the title, e.g. "404". */
  eyebrow?: string;
  title: string;
  body: string;
  action?: ReactNode;
  debugDetails?: string;
}

// General-purpose "this content area has nothing to show" block — used for the 404 route,
// route-level crash boundaries, and (from Sprint 4 on) section-level isError states.
// Deliberately content-scoped (no min-h-screen) so it fits inside whatever layout wraps it.
export function NotFoundState({ icon, eyebrow, title, body, action, debugDetails }: Props) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      {eyebrow && <div className="text-7xl font-bold text-primary">{eyebrow}</div>}
      {icon && (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          {icon}
        </div>
      )}
      <h2 className={eyebrow ? "mt-4 text-xl font-semibold text-foreground" : "text-xl font-semibold text-foreground"}>{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {debugDetails && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
          {debugDetails}
        </pre>
      )}
      {action && <div className="mt-6 flex items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
