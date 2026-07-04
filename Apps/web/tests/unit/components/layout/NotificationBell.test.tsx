import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/layout/NotificationBell";
import * as useRealtimeStatusHook from "@/hooks/useRealtimeStatus";

vi.mock("@/hooks/useRealtimeStatus");

describe("NotificationBell", () => {
  it("shows the idle empty state and no reconnect indicator when connected", async () => {
    const user = userEvent.setup();
    vi.mocked(useRealtimeStatusHook.useRealtimeStatus).mockReturnValue("connected");
    const { container } = render(<NotificationBell />);

    await user.click(screen.getByLabelText("admin.shell.bell.label"));
    expect(await screen.findByText("admin.shell.bell.empty")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("shows the reconnecting state and indicator dot while connecting", async () => {
    const user = userEvent.setup();
    vi.mocked(useRealtimeStatusHook.useRealtimeStatus).mockReturnValue("connecting");
    const { container } = render(<NotificationBell />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    await user.click(screen.getByLabelText("admin.shell.bell.label"));
    expect(await screen.findByText("admin.shell.bell.reconnecting")).toBeInTheDocument();
  });
});
