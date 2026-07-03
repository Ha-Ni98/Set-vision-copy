import type { ReactNode } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render } from "@testing-library/react";

// Unit tests mock the hooks, not the network (test-rules §5) — no QueryClientProvider
// needed here, since the components under test never reach real TanStack Query internals.
// A router context is still required for <Link>/useNavigate/useParams to work; `routes`
// lets a test register sibling paths (e.g. the list page a back-link points to).
export function renderWithRoutes(routes: Record<string, ReactNode>, initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        {Object.entries(routes).map(([path, element]) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}
