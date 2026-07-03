import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AdminHeader } from "@/components/layout/AdminHeader";
import * as useAuthHook from "@/components/providers/AuthProvider";
import * as useRealtimeStatusHook from "@/hooks/useRealtimeStatus";

vi.mock("@/components/providers/AuthProvider");
vi.mock("@/hooks/useRealtimeStatus");

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<AdminHeader />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminHeader", () => {
  it("confirms Sign Out and calls the session's logout", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      isReady: true,
      displayName: "Test Admin",
      login: vi.fn(),
      isLoggingIn: false,
      logout,
    });
    vi.mocked(useRealtimeStatusHook.useRealtimeStatus).mockReturnValue("connected");

    renderHeader();

    await user.click(screen.getByText("Test Admin"));
    await user.click(screen.getByText("common.actions.signOut"));
    const dialogSignOut = await screen.findAllByText("common.actions.signOut");
    await user.click(dialogSignOut[dialogSignOut.length - 1]);

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
