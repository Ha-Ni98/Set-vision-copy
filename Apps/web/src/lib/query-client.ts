import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import type { ApiResponse } from "@my-app/contract";
import { translate, type Language } from "@/lib/i18n";

// Non-component code — reads the persisted language directly rather than via context,
// per the non-reactive `translate()` escape hatch rules §6B allows outside components.
const getLanguage = (): Language => {
  const saved = typeof window !== "undefined" ? localStorage.getItem("sv_lang") : null;
  return saved === "fr" ? "fr" : "en";
};

const message = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined;
    if (data && !data.success) return data.error.message;
  }
  return translate("common.errors.crashTitle", getLanguage());
};

// 401s are handled by the axios interceptor (redirect), never a toast. Canceled/aborted
// requests (unmount, refetch superseded) are silent too — neither is a failure worth
// surfacing to the user.
const isSilent = (err: unknown): boolean =>
  axios.isCancel(err) || (axios.isAxiosError(err) && err.response?.status === 401);

const isRetryableFailure = (err: unknown): boolean =>
  !(
    axios.isAxiosError(err) &&
    !!err.response &&
    err.response.status >= 400 &&
    err.response.status < 500
  );

// Global error feedback lives on the cache, not per-hook (TanStack v5 removed `onError`
// from useQuery).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, err) => failureCount < 1 && isRetryableFailure(err),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (isSilent(err)) return;
      if (query.state.data !== undefined) toast.error(message(err)); // only on background-refetch failures
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (isSilent(err)) return;
      toast.error(message(err));
    },
  }),
});
