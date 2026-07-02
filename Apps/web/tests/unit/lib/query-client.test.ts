import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, CanceledError } from "axios";
import type { Query, Mutation, MutationFunctionContext } from "@tanstack/react-query";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { toast } from "sonner";
import { queryClient } from "@/lib/query-client";

// This suite calls the cache callbacks directly (a documented, public surface:
// `QueryCache`/`MutationCache` instances expose their `.config`) instead of driving them
// through real useQuery/useMutation renders. TanStack's own cancel-on-unmount machinery
// suppresses onError before it ever reaches our wiring for query cancellation it triggers
// itself (an internal implementation detail, out of bounds per plan.md §4.6) — the case
// this suite actually needs to prove is narrower and more stable: *our* suppression logic
// correctly recognizes an axios CanceledError/401 and skips the toast, whatever produced
// it. Fixture casts below stand in for the full `Query`/`Mutation` instances (only
// `state.data` is read by our onError), mirroring test-rules §5's own precedent for
// partial-shape mocks in unit tests.
const queryOnError = queryClient.getQueryCache().config.onError!;
const mutationOnError = queryClient.getMutationCache().config.onError!;

function fakeQuery(hasPriorData: boolean): Query<unknown, unknown, unknown> {
  return { state: { data: hasPriorData ? { seeded: true } : undefined } } as unknown as Query<
    unknown,
    unknown,
    unknown
  >;
}

const fakeMutation = {} as Mutation<unknown, unknown, unknown>;
const fakeMutationContext = {} as MutationFunctionContext;

function envelopeError(message: string, status: number): AxiosError {
  const err = new AxiosError(message, String(status));
  err.response = {
    status,
    statusText: "",
    headers: {},
    config: err.config ?? ({} as never),
    data: { success: false, error: { code: "VALIDATION_ERROR", message } },
  };
  return err;
}

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe("query-client — mutation errors", () => {
  it("toasts the server-provided error.message", () => {
    mutationOnError(
      envelopeError("Bad input", 400),
      undefined,
      undefined,
      fakeMutation,
      fakeMutationContext,
    );
    expect(toast.error).toHaveBeenCalledWith("Bad input");
  });

  it("never toasts on 401 — the axios interceptor owns it", () => {
    mutationOnError(
      envelopeError("expired", 401),
      undefined,
      undefined,
      fakeMutation,
      fakeMutationContext,
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("never toasts on a canceled request", () => {
    mutationOnError(new CanceledError(), undefined, undefined, fakeMutation, fakeMutationContext);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("falls back to the translated crash message when no envelope is present (network error)", () => {
    mutationOnError(
      new AxiosError("Network Error"),
      undefined,
      undefined,
      fakeMutation,
      fakeMutationContext,
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    const [message] = vi.mocked(toast.error).mock.calls[0];
    expect(typeof message).toBe("string");
    expect(message).not.toBe("Network Error"); // the raw axios message must not leak through
  });
});

describe("query-client — query errors", () => {
  it("stays silent on a first-load failure (no prior data)", () => {
    queryOnError(envelopeError("Bad input", 400), fakeQuery(false));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts on a background-refetch failure (prior data present)", () => {
    queryOnError(envelopeError("Bad input", 400), fakeQuery(true));
    expect(toast.error).toHaveBeenCalledWith("Bad input");
  });

  it("never toasts on 401, even with prior data", () => {
    queryOnError(envelopeError("expired", 401), fakeQuery(true));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("never toasts on a canceled request, even with prior data", () => {
    queryOnError(new CanceledError(), fakeQuery(true));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
