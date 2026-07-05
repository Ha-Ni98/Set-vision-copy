import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DistributorDetailPage from "@/pages/admin/distributors/DistributorDetailPage";
import { renderWithRoutes } from "../../../fixtures/wrappers/renderWithRouter";
import * as useDistributorsHook from "@/hooks/useDistributors";
import * as useOrdersHook from "@/hooks/useOrders";
import * as useCardsHook from "@/hooks/useCards";
import * as useGeographyHook from "@/hooks/useGeography";

vi.mock("@/hooks/useDistributors");
vi.mock("@/hooks/useOrders");
vi.mock("@/hooks/useCards");
vi.mock("@/hooks/useGeography");

const DISTRIBUTOR = {
  id: "dist-1",
  fullName: "Sample Distributor",
  storeName: "Sample Store",
  phone: "0555987654",
  wilayaId: "w1",
  wilayaName: "Alger",
  communeId: "c1",
  communeName: "Bab Ezzouar",
  isEnabled: true,
  nbOfActiveCards: 42,
  nbOfActivation: 310,
  deliveredOrdersCount: 12,
  createdAt: new Date().toISOString(),
  soldKeys: 268,
  ordersCount: 14,
};

const WILAYAS = [
  { id: "w1", wilayaCode: "16", frName: "Alger", arName: "" },
  { id: "w2", wilayaCode: "31", frName: "Oran", arName: "" },
];

function renderDetail(id = "dist-1") {
  return renderWithRoutes(
    {
      "/admin/distributors/:id": <DistributorDetailPage />,
      "/admin/distributors": <div>Distributors List Page</div>,
    },
    `/admin/distributors/${id}`,
  );
}

describe("DistributorDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDistributorsHook.useUpdateDistributor).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useDistributorsHook.useToggleDistributor).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useGeographyHook.useWilayas).mockReturnValue({
      data: WILAYAS,
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useGeographyHook.useCommunes).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useOrdersHook.useOrders).mockReturnValue({
      data: { items: [], meta: { page: 1, limit: 5, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useCardsHook.useCards).mockReturnValue({
      data: { items: [], meta: { page: 1, limit: 5, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("shows Distributor-not-found with a back link for an errored/invalid id", () => {
    vi.mocked(useDistributorsHook.useDistributor).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);
    renderDetail("does-not-exist");

    expect(screen.getByText("admin.distributors.detail.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("admin.distributors.detail.notFound.backLink")).toBeInTheDocument();
  });

  it("shows both compact tables' empty states when there are no orders/cards", () => {
    vi.mocked(useDistributorsHook.useDistributor).mockReturnValue({
      data: DISTRIBUTOR,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    expect(screen.getByText("admin.distributors.detail.orders.empty")).toBeInTheDocument();
    expect(screen.getByText("admin.distributors.detail.cards.empty")).toBeInTheDocument();
  });

  it("resets the commune selection when the wilaya changes during inline edit", async () => {
    const user = userEvent.setup();
    vi.mocked(useDistributorsHook.useDistributor).mockReturnValue({
      data: DISTRIBUTOR,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDetail();

    await user.click(screen.getByText("common.actions.edit"));
    const wilayaTrigger = screen.getAllByRole("combobox")[0];
    await user.click(wilayaTrigger);
    await user.click(await screen.findByRole("option", { name: "Oran" }));

    // Changing wilaya calls useCommunes with the new id (commune is cleared/re-filtered) —
    // the profile card's onEditWilayaChange drives the page's useCommunes(editWilayaId) call.
    expect(useGeographyHook.useCommunes).toHaveBeenCalledWith("w2");
  });
});
