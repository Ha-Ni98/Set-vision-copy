import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockPaginatedLogs } from "../../fixtures/data/logs.mock";
import { useLogs } from "@/hooks/useLogs";

describe("useLogs", () => {
  it("resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useLogs({ page: 1, limit: 10 }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedLogs);
  });
});
