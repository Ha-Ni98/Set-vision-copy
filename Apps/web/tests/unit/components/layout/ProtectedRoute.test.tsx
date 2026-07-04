import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { UserRole } from "@my-app/contract";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute";
import * as AuthProviderModule from "@/components/providers/AuthProvider";
import * as useSessionHook from "@/hooks/useSession";

vi.mock("@/components/providers/AuthProvider");
vi.mock("@/hooks/useSession");

function mockAuth(isReady: boolean, isAuthenticated = false) {
  vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
    isAuthenticated,
    isReady,
    displayName: null,
    login: vi.fn(),
    isLoggingIn: false,
    logout: vi.fn(),
  } as never);
}

function mockSession(role: UserRole | null) {
  vi.mocked(useSessionHook.useSession).mockReturnValue({
    data: role ? { id: "1", username: "u", role, fullName: "Test User" } : undefined,
  } as never);
}

function renderPublicOnly(initialRoute = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/admin" element={<div>Admin Home</div>} />
        <Route path="/dashboard" element={<div>Activator Dashboard</div>} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<div>Login Form</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderProtected(initialRoute = "/requests") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Form</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/requests" element={<div>Requests Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicOnlyRoute — role-based redirect off /login (activator-portal E-4)", () => {
  it("shows a full-page spinner while the session is still resolving", () => {
    mockAuth(false);
    mockSession(null);
    const { container } = renderPublicOnly();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders the login form (Outlet) when there is no session", () => {
    mockAuth(true);
    mockSession(null);
    renderPublicOnly();
    expect(screen.getByText("Login Form")).toBeInTheDocument();
  });

  it("redirects an already-authenticated ACTIVATOR to /dashboard, not /admin", () => {
    mockAuth(true, true);
    mockSession(UserRole.ACTIVATOR);
    renderPublicOnly();
    expect(screen.getByText("Activator Dashboard")).toBeInTheDocument();
  });

  it("redirects an already-authenticated ADMIN to /admin, not /dashboard", () => {
    mockAuth(true, true);
    mockSession(UserRole.ADMIN);
    renderPublicOnly();
    expect(screen.getByText("Admin Home")).toBeInTheDocument();
  });
});

describe("ProtectedRoute", () => {
  it("shows a full-page spinner while the session is still resolving", () => {
    mockAuth(false);
    const { container } = renderProtected();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated", () => {
    mockAuth(true, false);
    renderProtected();
    expect(screen.getByText("Login Form")).toBeInTheDocument();
  });

  it("renders the nested route (Outlet) once authenticated", () => {
    mockAuth(true, true);
    renderProtected();
    expect(screen.getByText("Requests Page")).toBeInTheDocument();
  });
});
