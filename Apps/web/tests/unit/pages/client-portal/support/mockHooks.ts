import { vi } from "vitest";

// Shared across all four client-portal page test files (side-effect import, same pattern as
// tests/fixtures/wrappers/mockTranslation.ts) — LandingPage and its children only ever reach
// these hooks, never the network (test-rules §5). `lib/realtime` is mocked too:
// CheckAnotherKeyButton imports `unsubscribeActivation` directly, not through a hook.
vi.mock("@/hooks/useVerifyKey");
vi.mock("@/hooks/useSubmitActivation");
vi.mock("@/hooks/useUpdateActivation");
vi.mock("@/hooks/useSubmitAdditionalInfo");
vi.mock("@/hooks/useActivationStatus");
vi.mock("@/lib/realtime", () => ({
  subscribeActivation: vi.fn(),
  unsubscribeActivation: vi.fn(),
  getRealtimeStatus: vi.fn(() => "connected"),
}));
