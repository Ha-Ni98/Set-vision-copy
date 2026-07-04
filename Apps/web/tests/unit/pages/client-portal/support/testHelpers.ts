import { vi } from "vitest";
import type { ClientActivationStatusDTO } from "@my-app/contract";

// A bare mutation shape — every mocked mutation hook in this portal (verify/submit/update/
// submitAdditionalInfo) only ever needs `.mutate`/`.isPending` from LandingPage's own tree.
export function mutationMock(overrides: Record<string, unknown> = {}) {
  return { mutate: vi.fn(), isPending: false, ...overrides };
}

// useActivationStatus's mocked return — LandingPage only reads `.data`.
export function statusQueryMock(
  data: ClientActivationStatusDTO | undefined = undefined,
  overrides: Record<string, unknown> = {},
) {
  return { data, isLoading: false, isError: false, ...overrides };
}
