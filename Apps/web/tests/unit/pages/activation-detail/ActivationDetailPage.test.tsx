import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivationStat, CardStat } from "@my-app/contract";
import ActivationDetailPage from "@/pages/admin/activations/ActivationDetailPage";
import { renderWithRoutes } from "../../../fixtures/wrappers/renderWithRouter";
import * as useAdminActivationsHook from "@/hooks/useAdminActivations";

vi.mock("@/hooks/useAdminActivations");

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: "act-1",
    client: { fullName: "Client One", phone: "0555000000" },
    distributor: { storeName: "Store One", wilayaName: "Alger", communeName: "Bab Ezzouar" },
    activator: { id: "activator-1", fullName: "Ali Benali" },
    submittedInformation: [],
    timeline: [
      {
        stat: ActivationStat.PENDING,
        createdAt: new Date().toISOString(),
        wrongFields: [],
        additionalFields: [],
        freezeReason: null,
      },
    ],
    cardHistory: [{ stat: CardStat.IN_SET, at: new Date().toISOString() }],
    financial: { activationPrice: null, commissionTierLabel: "Tier 1" },
    ...overrides,
  };
}

function renderDetail(id = "act-1") {
  return renderWithRoutes(
    {
      "/admin/activations/:id": <ActivationDetailPage />,
      "/admin/activations": <div>Activations List Page</div>,
    },
    `/admin/activations/${id}`,
  );
}

describe("ActivationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminActivationsHook.useSetActivationPrice).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  it("shows NotFoundState with a back link for an errored/invalid id", () => {
    vi.mocked(useAdminActivationsHook.useActivationDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);
    renderDetail("does-not-exist");

    expect(screen.getByText("admin.activationDetail.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("admin.activationDetail.notFound.backLink")).toBeInTheDocument();
  });

  it("renders the activator as a Link and the distributor as plain text (§E-2)", () => {
    vi.mocked(useAdminActivationsHook.useActivationDetail).mockReturnValue({
      data: detail(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    const activatorLink = screen.getByText("Ali Benali").closest("a");
    expect(activatorLink).toHaveAttribute("href", "/admin/activators/activator-1");
    // Distributor's store name is present but not wrapped in a link.
    expect(screen.getByText("Store One").closest("a")).toBeNull();
  });

  it("shows an empty state for a null activator", () => {
    vi.mocked(useAdminActivationsHook.useActivationDetail).mockReturnValue({
      data: detail({ activator: null }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    expect(screen.getByText("admin.activationDetail.activator.none")).toBeInTheDocument();
  });

  it("renders WRONG_INFORMATION, ADDITIONAL_INFORMATION, and FREEZE timeline variants", () => {
    vi.mocked(useAdminActivationsHook.useActivationDetail).mockReturnValue({
      data: detail({
        timeline: [
          {
            stat: ActivationStat.WRONG_INFORMATION,
            createdAt: new Date().toISOString(),
            wrongFields: [{ fieldLabel: "Email", value: "bad@x" }],
            additionalFields: [],
            freezeReason: null,
          },
          {
            stat: ActivationStat.ADDITIONAL_INFORMATION,
            createdAt: new Date().toISOString(),
            wrongFields: [],
            additionalFields: [{ fieldLabel: "Birthday", value: "2000-01-01" }],
            freezeReason: null,
          },
          {
            stat: ActivationStat.FREEZE,
            createdAt: new Date().toISOString(),
            wrongFields: [],
            additionalFields: [],
            freezeReason: "Suspicious activity",
          },
        ],
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    expect(screen.getByText("Email: bad@x")).toBeInTheDocument();
    expect(screen.getByText("Birthday: 2000-01-01")).toBeInTheDocument();
    expect(screen.getByText("Suspicious activity")).toBeInTheDocument();
  });

  it("shows Set Price for a completed+unpriced activation and calls the mutation with the real amount", async () => {
    const user = userEvent.setup();
    const setPriceMutate = vi.fn();
    vi.mocked(useAdminActivationsHook.useSetActivationPrice).mockReturnValue({
      mutate: setPriceMutate,
      isPending: false,
    } as never);
    vi.mocked(useAdminActivationsHook.useActivationDetail).mockReturnValue({
      data: detail({
        timeline: [
          {
            stat: ActivationStat.ACTIVATED,
            createdAt: new Date().toISOString(),
            wrongFields: [],
            additionalFields: [],
            freezeReason: null,
          },
        ],
        financial: { activationPrice: null, commissionTierLabel: "Tier 1" },
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    await user.click(screen.getByText("admin.activations.actions.setPrice"));
    const dialog = await screen.findByRole("dialog");
    const amountInput = within(dialog).getByLabelText("admin.activations.setPriceModal.amount");
    await user.clear(amountInput);
    await user.type(amountInput, "600");
    await user.click(within(dialog).getByText("common.actions.confirm"));

    expect(setPriceMutate).toHaveBeenCalledWith(
      { id: "act-1", command: { amount: 600 } },
      expect.anything(),
    );
  });

  it("does not show Set Price when the activation already has a price", () => {
    vi.mocked(useAdminActivationsHook.useActivationDetail).mockReturnValue({
      data: detail({
        timeline: [
          {
            stat: ActivationStat.ACTIVATED,
            createdAt: new Date().toISOString(),
            wrongFields: [],
            additionalFields: [],
            freezeReason: null,
          },
        ],
        financial: { activationPrice: 500, commissionTierLabel: "Tier 1" },
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    expect(screen.queryByText("admin.activations.actions.setPrice")).not.toBeInTheDocument();
  });
});
