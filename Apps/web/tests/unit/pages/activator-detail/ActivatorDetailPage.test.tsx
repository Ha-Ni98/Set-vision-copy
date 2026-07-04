import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivatorDetailPage from "@/pages/admin/activators/ActivatorDetailPage";
import { renderWithRoutes } from "../../../fixtures/wrappers/renderWithRouter";
import * as useActivatorsHook from "@/hooks/useActivators";
import * as usePaymentsHook from "@/hooks/usePayments";

vi.mock("@/hooks/useActivators");
vi.mock("@/hooks/usePayments");

const ACTIVATOR = {
  id: "act-1",
  userId: "u-1",
  fullName: "Ali Benali",
  username: "ali_b",
  phone: "0555123456",
  isEnabled: true,
  totalEarning: 45000,
  credits: 12000,
  nbOfActivation: 128,
  nbOfSuccessfulActivation: 120,
  avgActivationTimeSeconds: 240,
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
  totalPaid: 33000,
  creditsOwed: 12000,
  successRate: 0.9375,
};

function renderDetail(id = "act-1") {
  return renderWithRoutes(
    {
      "/admin/activators/:id": <ActivatorDetailPage />,
      "/admin/activators": <div>Activators List Page</div>,
    },
    `/admin/activators/${id}`,
  );
}

describe("ActivatorDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActivatorsHook.useActivatorPerformance).mockReturnValue({
      data: { series: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useActivatorsHook.useUpdateActivator).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useActivatorsHook.useToggleActivator).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(usePaymentsHook.useRecordPayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(usePaymentsHook.usePayments).mockReturnValue({
      data: { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("shows Activator-not-found with a back link for an errored/invalid id", () => {
    vi.mocked(useActivatorsHook.useActivator).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);
    renderDetail("does-not-exist");

    expect(screen.getByText("admin.activators.detail.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("admin.activators.detail.notFound.backLink")).toBeInTheDocument();
  });

  it("confirms deleting a payment and calls useDeletePayment.mutate with its id", async () => {
    const user = userEvent.setup();
    const deleteMutate = vi.fn();
    vi.mocked(useActivatorsHook.useActivator).mockReturnValue({
      data: ACTIVATOR,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(usePaymentsHook.usePayments).mockReturnValue({
      data: {
        items: [
          {
            id: "pay-1",
            activatorId: "act-1",
            amount: 5000,
            previousCredits: 17000,
            paymentDate: new Date().toISOString(),
            recordedByName: "Admin One",
            isDeleted: false,
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(usePaymentsHook.useDeletePayment).mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
    } as never);

    renderDetail();

    // DataTable renders both desktop and mobile row variants at once in JSDOM (no CSS
    // media query evaluation) — both delete buttons share this aria-label; take the first.
    await user.click(screen.getAllByLabelText("common.actions.delete")[0]);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByText("common.actions.delete"));

    expect(deleteMutate).toHaveBeenCalledWith("pay-1");
  });

  it("reveals the one-time password after confirming a password reset", async () => {
    const user = userEvent.setup();
    vi.mocked(useActivatorsHook.useActivator).mockReturnValue({
      data: ACTIVATOR,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useActivatorsHook.useResetActivatorPassword).mockReturnValue({
      mutate: (_id: string, opts?: { onSuccess?: (d: unknown) => void }) =>
        opts?.onSuccess?.({ generatedPassword: "Fresh1234!" }),
      isPending: false,
    } as never);

    renderDetail();

    await user.click(screen.getByText("common.actions.resetPassword"));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByText("common.actions.resetPassword"));

    expect(await screen.findByText("Fresh1234!")).toBeInTheDocument();
  });
});
