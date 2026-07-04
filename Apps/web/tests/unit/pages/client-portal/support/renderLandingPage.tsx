import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import LandingPage from "@/pages/LandingPage";
import { ActivationProvider } from "@/components/providers/ActivationProvider";

// No QueryClientProvider/router needed — every data hook is mocked (test-rules §5), and
// nothing under LandingPage's own tree uses <Link>/useNavigate (that's PublicHeader/Footer,
// rendered by PublicLayout, one level up — out of this page's own test scope).
// ActivationContext is real, though: LandingPage and CheckAnotherKeyButton both call
// useActivation() directly, which throws outside a provider.
function landingPageTree() {
  return (
    <ActivationProvider>
      <LandingPage />
    </ActivationProvider>
  );
}

export function renderLandingPage() {
  return render(landingPageTree());
}

// For tests that simulate a realtime-driven refetch: update the mocked hook's return value,
// then re-render the *same* element tree (not a fresh one) so ActivationProvider's state
// survives, matching how a real re-render from a query update behaves.
export function rerenderLandingPage(rerender: (ui: ReactElement) => void) {
  rerender(landingPageTree());
}
