import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { UserRole } from "@my-app/contract";
import { AdminGuard } from "@/components/layout/AdminGuard";
import * as useSessionHook from "@/hooks/useSession";

vi.mock("@/hooks/useSession");

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Activator Dashboard</div>} />
        <Route path="/admin" element={<AdminGuard />}>
          <Route index element={<div>Admin Page Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminGuard", () => {
  it("shows a full-page spinner while the session is resolving", () => {
    vi.mocked(useSessionHook.useSession).mockReturnValue({
      data: undefined,
      isPending: true,
    } as never);
    const { container } = renderGuard();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /login when there is no session", () => {
    vi.mocked(useSessionHook.useSession).mockReturnValue({
      data: undefined,
      isPending: false,
    } as never);
    renderGuard();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirects to /dashboard when the session role isn't ADMIN", () => {
    vi.mocked(useSessionHook.useSession).mockReturnValue({
      data: { id: "1", username: "activator1", role: UserRole.ACTIVATOR, fullName: "Ali" },
      isPending: false,
    } as never);
    renderGuard();
    expect(screen.getByText("Activator Dashboard")).toBeInTheDocument();
  });

  it("renders the nested route (Outlet) for an admin session", () => {
    vi.mocked(useSessionHook.useSession).mockReturnValue({
      data: { id: "1", username: "admin1", role: UserRole.ADMIN, fullName: "Admin" },
      isPending: false,
    } as never);
    renderGuard();
    expect(screen.getByText("Admin Page Content")).toBeInTheDocument();
  });
});
