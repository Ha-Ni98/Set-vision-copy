import { Loader2 } from "lucide-react";

// Suspense fallback for React.lazy() route code-splitting only — not for data loading
// (rules §5). Content-scoped (min-h-[50vh], not full-screen) so it fits inside a layout.
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
