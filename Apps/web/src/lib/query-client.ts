import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { translate, type Language } from "@/lib/i18n";

// Non-component code — reads the persisted language directly rather than via context,
// per the non-reactive `translate()` escape hatch rules §6B allows outside components.
const getLanguage = (): Language => {
  const saved = typeof window !== "undefined" ? localStorage.getItem("sv_lang") : null;
  return saved === "fr" ? "fr" : "en";
};

const message = (err: unknown) =>
  (err as any)?.response?.data?.error?.message ?? translate("common.errors.crashTitle", getLanguage());

// Global error feedback lives on the cache, not per-hook (TanStack v5 removed `onError`
// from useQuery). 401s are handled by the axios interceptor (redirect), never a toast here.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (query.state.data !== undefined) toast.error(message(err)); // only on background-refetch failures
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => toast.error(message(err)),
  }),
});
