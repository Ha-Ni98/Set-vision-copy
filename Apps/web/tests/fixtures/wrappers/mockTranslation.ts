import { vi } from "vitest";

// Per front-end-test-rules.md §6 — mock the hook (not a static t()), return the key itself
// so tests assert keys, never translated copy. `vars` are ignored (keys are what's asserted).
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));

// Several components (date/DZD formatting) call useLanguage() directly, not just
// useTranslation() — mock it too so those don't throw "outside provider".
vi.mock("@/components/providers/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en", setLanguage: vi.fn() }),
}));
